const { getOrganizationElements } = require('./fintOrg')
const getOrgEmployees = require('./orgEmployees')
const { logger } = require('@vtfk/logger')

module.exports = async () => {
  const organizationElements = await getOrganizationElements()
  const orgEmployees = await getOrgEmployees()

  // Data from AzureAD
  logger('info', ['bakeOrg', 'Master chef is at it - baking org data together, this might take some time...'])
  const today = new Date()
  const bakedOrgElements = organizationElements.map(element => {
    const baked = {
      ...element,
      
      arbeidsforhold: (element.arbeidsforhold && Array.isArray(element.arbeidsforhold)) ? element.arbeidsforhold.map(sysId => { // element arbeidsforhold is a list of systemIds. Foreach systemId - find an employee where employee.arbeidsforhold includes the systemId from the element.arbeidsforhold
        const employee = orgEmployees.find(employee => employee.aktiveArbeidsforhold.map(forhold => forhold.systemId).includes(sysId))
        if (employee) {
          const arbForhold = employee.aktiveArbeidsforhold.find(forhold => forhold.systemId === sysId)
          const repacked = {
            ...arbForhold,
            navn: `${employee.fornavn} ${employee.etternavn}`,
            ansattnummer: employee.ansattnummer,
            userPrincipalName: employee.userPrincipalName,
            personalressurskategori: employee.personalressurskategori
          }
          return repacked
        }
        return sysId
      }).filter(forhold => typeof forhold !== 'string') : []
    }
    return baked
  }).filter(element => (!element.gyldighetsperiode.slutt) || (element.gyldighetsperiode.slutt && new Date(element.gyldighetsperiode.slutt) > today))

  logger('info', ['bakeOrg', 'Master chef is done - baking complete!'])
  return bakedOrgElements
}
