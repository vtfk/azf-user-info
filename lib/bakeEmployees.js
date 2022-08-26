const { getEmployeePersons, getEmployeePositions, getEmployeeResources, getEmployeepositionCodes, getOrganizationElements, getResourceCategoryCodes } = require('./fintEmployee')
const { getOfficeLocations } = require('./graphRequests')
const { unknownValue } = require('../config')
const { logger } = require('@vtfk/logger')

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
  const bakedPersons = employeePersons.map(person => {
    const employeeResource = employeeResources.find(resource => (resource.ansattnummer !== unknownValue && resource.ansattnummer === person.ansattnummer))
    employeeResource.personalressurskategori = resourceCategoryCodes.find(code => code.systemId === employeeResource.personalressurskategori)
    const azureADInfo = officeLocations.value.find(user => user.onPremisesSamAccountName.toLowerCase() === employeeResource.brukernavn.toLowerCase())
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
        return withOrgInfo
      })
    }
    return baked
  })
  logger('info', ['bakeEmployees', 'Master chef is done - baking complete!'])
  return bakedPersons
}
