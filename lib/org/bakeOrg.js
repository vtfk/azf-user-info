const { getOrganizationElements } = require('./fintOrg')
const getOrgEmployees = require('./orgEmployees')
const { logger } = require('@vtfk/logger')
const { unknownValue } = require('../../config')

module.exports = async () => {
  const organizationElements = await getOrganizationElements()
  const orgEmployees = await getOrgEmployees()

  // Data from AzureAD
  logger('info', ['bakeOrg', 'Master chef is at it - baking org data together, this might take some time...'])
  const today = new Date()
  const bakedOrgElements = organizationElements.map(element => {
    const manager = orgEmployees.find(employee => employee.ansattnummer === element.leder)
    const parent = organizationElements.find(ele => ele.organisasjonsId === element.overordnet)
    const children = organizationElements.filter(ele => element.underordnet.includes(ele.organisasjonsId))
    const baked = {
      ...element,
      overordnet: {
        organisasjonsId: parent?.organisasjonsId ?? unknownValue,
        navn: parent?.navn ?? unknownValue
      },
      underordnet: children.map(child => { return { organisasjonsId: child.organisasjonsId, navn: child.navn } }),
      leder: {
        userPrincipalName: manager?.userPrincipalName ?? unknownValue,
        navn: manager ? `${manager.fornavn} ${manager.etternavn}` : unknownValue,
        officeLocation: manager?.azureAd?.officeLocation ?? unknownValue,
        ansattnummer: element.leder ?? unknownValue
      },
      arbeidsforhold: (element.arbeidsforhold && Array.isArray(element.arbeidsforhold)) ? element.arbeidsforhold.map(sysId => { // element arbeidsforhold is a list of systemIds. Foreach systemId - find an employee where employee.arbeidsforhold includes the systemId from the element.arbeidsforhold
        const employee = orgEmployees.find(employee => employee.aktiveArbeidsforhold.map(forhold => forhold.systemId).includes(sysId))
        if (employee) {
          const arbForhold = employee.aktiveArbeidsforhold.find(forhold => forhold.systemId === sysId)
          const repacked = {
            ...arbForhold,
            navn: `${employee.fornavn} ${employee.etternavn}`,
            ansattnummer: employee.ansattnummer,
            userPrincipalName: employee.userPrincipalName,
            officeLocation: employee.azureAd?.officeLocation ?? unknownValue,
            personalressurskategori: employee.personalressurskategori,
            mandatoryCompetenceInput: employee.mandatoryCompetenceInput
          }
          return repacked
        }
        return sysId
      }).filter(forhold => typeof forhold !== 'string') : []
    }
    return baked
  }).filter(element => (!element.gyldighetsperiode.slutt) || (element.gyldighetsperiode.slutt && new Date(element.gyldighetsperiode.slutt) > today))

  await logger('info', ['bakeOrg', 'Master chef is done - baking complete!'])
  return bakedOrgElements
}
