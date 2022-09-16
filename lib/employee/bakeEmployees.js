const { getEmployeePersons, getEmployeePositions, getEmployeeResources, getEmployeePositionCodes, getOrganizationElements, getResourceCategoryCodes } = require('./fintEmployee')
const { getAzureAdPersons } = require('../graphRequests')
const { unknownValue, mongoDB, deleteAfterInactiveDays, mock } = require('../../config')
const { logger } = require('@vtfk/logger')
const mongo = require('../mongo')
const findPersonDiff = require('../findPersonDiff')

const bakeEmployeeData = (resourceCategoryCodes, employeePositionCodes, employeePersons, employeeResources, employeePositions, organizationElements, azureAdPersons) => {
  const today = new Date()
  // Map every employeePerson
  const bakedPersons = employeePersons.map(person => {
    // Find the related employeeResource
    const employeeResource = employeeResources.find(resource => (resource.ansattnummer !== unknownValue && resource.ansattnummer === person.ansattnummer))
    // Expand the field "personalressurskategori"
    employeeResource.personalressurskategori = resourceCategoryCodes.find(code => code.systemId === employeeResource.personalressurskategori)

    // Find the related azure AD user through upn match with visma kontaktEpostadresse
    let azureADInfo = azureAdPersons.value.find(user => (user.userPrincipalName && employeeResource.kontaktEpostadresse) && (user.userPrincipalName.toLowerCase() === employeeResource.kontaktEpostadresse.toLowerCase()))
    // If not found through upn match - try to find through samAccountName match with visma brukernavn
    if (!azureADInfo) {
      azureADInfo = azureAdPersons.value.find(user => (user.onPremisesSamAccountName && employeeResource.brukernavn) && (user.onPremisesSamAccountName.toLowerCase() === employeeResource.brukernavn.toLowerCase()))
    }
    // If not found through samAccountName match - try to find through extensionAttribute9 match with visma ansattnummer
    if (!azureADInfo) {
      azureADInfo = azureAdPersons.value.find(user => (user.onPremisesExtensionAttributes.extensionAttribute9 && employeeResource.ansattnummer) && (user.onPremisesExtensionAttributes.extensionAttribute9 === employeeResource.ansattnummer))
    }

    const aktiveArbeidsforhold = []
    const baked = {
      userPrincipalName: azureADInfo?.userPrincipalName ?? unknownValue, // put on top level - simpler indexing in db
      samAccountName: azureADInfo?.onPremisesSamAccountName ?? unknownValue, // put on top level - simpler indexing in db
      azureAd: azureADInfo,
      ...person,
      ...employeeResource,
      arbeidsforhold: employeePositions.filter(position => (position.systemId !== unknownValue && employeeResource.arbeidsforhold.includes(position.systemId))).map(forhold => { // Find the employeePositions related to the employeeResource - map the result
        const withOrgInfo = {
          ...forhold,
          stillingskode: employeePositionCodes.find(code => code.systemId === forhold.stillingskode), // Expand the field "stillingskode"
          arbeidssted: organizationElements.find(element => element.organisasjonsId !== unknownValue && element.organisasjonsId === forhold.arbeidssted) // Find the organizationElement related to the employeePosition
        }
        // Check if position is currently active. First if it has not expired, then if it has actually begun. If active, add it to activePositions, for simpler understanding of a users positions
        if ((forhold.gyldighetsperiode && (!forhold.gyldighetsperiode.slutt || new Date(forhold.gyldighetsperiode.slutt) > today)) && ((forhold.arbeidsforholdsperiode && (!forhold.arbeidsforholdsperiode.slutt || new Date(forhold.arbeidsforholdsperiode.slutt) > today)))) {
          if ((forhold.gyldighetsperiode.start && new Date(forhold.gyldighetsperiode.start) < today) && (forhold.arbeidsforholdsperiode.start && new Date(forhold.arbeidsforholdsperiode.start) < today)) {
            aktiveArbeidsforhold.push(withOrgInfo)
          }
        }
        return withOrgInfo
      }),
      fintStatus: {
        active: true,
        lastFetched: new Date().toISOString()
      }
    }
    baked.aktiveArbeidsforhold = aktiveArbeidsforhold
    baked.tidligereArbeidsforhold = baked.arbeidsforhold.filter(forhold => !(baked.aktiveArbeidsforhold.map(aForhold => aForhold.systemId)).includes(forhold.systemId)) ?? unknownValue
    delete baked.arbeidsforhold
    baked.harAktivtArbeidsforhold = aktiveArbeidsforhold.length > 0
    return baked
  })
  return bakedPersons
}

const bakeEmployees = async () => {
  // Kodeverk
  const resourceCategoryCodes = await getResourceCategoryCodes()
  const employeePositionCodes = await getEmployeePositionCodes()
  // Data from FINT
  const employeePersons = await getEmployeePersons()
  const employeeResources = await getEmployeeResources()
  const employeePositions = await getEmployeePositions()
  const organizationElements = await getOrganizationElements()
  // Data from AzureAD
  const azureAdPersons = await getAzureAdPersons()

  // Bake
  logger('info', ['bakeEmployees', 'Master chef is at it - baking employee data together, this might take some time...'])
  const bakedPersons = bakeEmployeeData(resourceCategoryCodes, employeePositionCodes, employeePersons, employeeResources, employeePositions, organizationElements, azureAdPersons)

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

module.exports = { bakeEmployeeData, bakeEmployees }
