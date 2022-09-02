const { getEmployeePersons, getEmployeePositions, getEmployeeResources, getEmployeepositionCodes, getOrganizationElements, getResourceCategoryCodes } = require('./fintEmployee')
const { getOfficeLocations } = require('../graphRequests')
const { unknownValue, mongoDB, deleteAfterInactiveDays } = require('../../config')
const { logger } = require('@vtfk/logger')
const mongo = require('../mongo')
const findPersonDiff = require('../findPersonDiff')

module.exports = async () => {
  // Kodeverk
  const resourceCategoryCodes = await getResourceCategoryCodes()
  const employeepositionCodes = await getEmployeepositionCodes()
  // Data from FINT
  const employeePersons = await getEmployeePersons()
  const employeeResources = await getEmployeeResources()
  const employeePositions = await getEmployeePositions()
  const organizationElements = await getOrganizationElements()
  // Data from AzureAD
  const officeLocations = await getOfficeLocations()

  logger('info', ['bakeEmployees', 'Master chef is at it - baking employee data together, this might take some time...'])
  const today = new Date()
  const bakedPersons = employeePersons.map(person => {
    const employeeResource = employeeResources.find(resource => (resource.ansattnummer !== unknownValue && resource.ansattnummer === person.ansattnummer))
    employeeResource.personalressurskategori = resourceCategoryCodes.find(code => code.systemId === employeeResource.personalressurskategori)
    const azureADInfo = officeLocations.value.find(user => user.onPremisesSamAccountName.toLowerCase() === employeeResource.brukernavn.toLowerCase())
    const aktiveArbeidsforhold = []
    const baked = {
      userPrincipalName: azureADInfo?.userPrincipalName ?? unknownValue,
      samAccountName: azureADInfo?.onPremisesSamAccountName ?? unknownValue,
      ...person,
      kontorsted: azureADInfo?.officeLocation ?? unknownValue,
      ...employeeResource,
      arbeidsforhold: employeePositions.filter(position => (position.systemId !== unknownValue && employeeResource.arbeidsforhold.includes(position.systemId))).map(forhold => {
        const withOrgInfo = {
          ...forhold,
          stillingskode: employeepositionCodes.find(code => code.systemId === forhold.stillingskode),
          arbeidssted: organizationElements.find(element => element.organisasjonsId !== unknownValue && element.organisasjonsId === forhold.arbeidssted)
        }
        if (forhold.gyldighetsperiode && (!forhold.gyldighetsperiode.slutt || new Date(forhold.gyldighetsperiode.slutt) > today)) {
          aktiveArbeidsforhold.push(withOrgInfo)
        }
        return withOrgInfo
      }),
      fintStatus: {
        active: true,
        lastFetched: new Date().toISOString()
      }
    }
    baked.aktiveArbeidsforhold = aktiveArbeidsforhold
    baked.harAktivtArbeidsforhold = aktiveArbeidsforhold.length > 0
    return baked
  })

  logger('info', ['bakeEmployees', 'Fetching the whole collection from mongo'])
  const db = await mongo()
  const collection = db.collection(mongoDB.employeeCollection)
  const oldData = await collection.find({}).toArray()
  logger('info', ['bakeEmployees', `Fetched ${oldData.length} elements from Mongo collection`])
  logger('info', ['bakeEmployees', `Comparing old and new data, checking for stale persons, adding fintStatus, and deleting ${deleteAfterInactiveDays} days stale persons`])
  const newData = findPersonDiff(oldData, bakedPersons)
  logger('info', ['bakeEmployees', 'Master chef is done - baking complete!'])
  return newData
}
