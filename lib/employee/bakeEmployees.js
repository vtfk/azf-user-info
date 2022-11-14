const { getEmployeePersons, getEmployeePositions, getEmployeeResources, getEmployeePositionCodes, getOrganizationElements, getResourceCategoryCodes } = require('./fintEmployee')
const { getAzureAdPersons } = require('../graphRequests')
const { unknownValue, mongoDB, deleteAfterInactiveDays, mock } = require('../../config')
const { logger } = require('@vtfk/logger')
const mongo = require('../mongo')
const findPersonDiff = require('../findPersonDiff')


const bakeEmployeeData = (resourceCategoryCodes, employeePositionCodes, employeePersons, employeeResources, employeePositions, organizationElements, azureAdPersons, settings) => {
  // Settings
  const mandatoryEmployees = (Array.isArray(settings) && settings.length) > 0 ? settings[0].oblig?.chosenEmployees ?? [] : []
  
  const cache = {
    orgStructure: {}
  }

  // We only need to get orgunit once, then cache it for further use
  const getOrgInfo = (unitId) => {
    if (!unitId) return unknownValue
    if (cache.orgStructure[unitId]) return cache.orgStructure[unitId]
    const unit = organizationElements.find(element => element.organisasjonsId !== unknownValue && element.organisasjonsId === unitId)
    if (!unit) {
      cache.orgStructure[unitId] = unknownValue // If we could not find it, we won't find it next time either...
      return unknownValue
    }

    // Get leader and organizaitonal structure with leaders
    let current = unit
    if (current) {
      const manager = employeePersons.find(person => person.ansattnummer !== unknownValue && person.ansattnummer === current.leder)
      unit.leder = {
        ansattnummer: manager ? manager.ansattnummer : current.leder,
        navn: manager ? `${manager.fornavn} ${manager.etternavn}` : 'Ukjent navn',
      }
      const managerAzure = azureAdPersons.value.find(user => (user.onPremisesExtensionAttributes.extensionAttribute9 && current.leder) && ((user.onPremisesExtensionAttributes.extensionAttribute9 === current.leder.ansattnummer) || user.onPremisesExtensionAttributes.extensionAttribute9 === current.leder))
      unit.struktur = [ { organisasjonsId: unit.organisasjonsId, kortnavn: unit.kortnavn, navn: unit.navn, leder: managerAzure ? managerAzure.userPrincipalName : 'Ukjent leder', ledernavn: managerAzure ? managerAzure.displayName : 'Ukjent ledernavn' } ]
    }
    // Traverse upwards in org-structure to get org-path of this employment
    while (current && current.overordnet !== current.organisasjonsId) {
      current = organizationElements.find(element => element.organisasjonsId !== unknownValue && element.organisasjonsId === current.overordnet)
      const managerAzure = azureAdPersons.value.find(user => (user.onPremisesExtensionAttributes.extensionAttribute9 && current.leder) && ((user.onPremisesExtensionAttributes.extensionAttribute9 === current.leder.ansattnummer) || user.onPremisesExtensionAttributes.extensionAttribute9 === current.leder))
      unit.struktur.push( { organisasjonsId: current.organisasjonsId, kortnavn: current.kortnavn, navn: current.navn, leder: managerAzure ? managerAzure.userPrincipalName : 'Ukjent leder', ledernavn: managerAzure ? managerAzure.displayName : 'Ukjent ledernavn' } )
    }
    cache.orgStructure[unitId] = unit
    return unit
  }

  const today = new Date()
  // Map every employeePerson
  const bakedPersons = employeePersons.map(person => {
    // Find the related employeeResource
    const employeeResource = employeeResources.find(resource => (resource.ansattnummer !== unknownValue && resource.ansattnummer === person.ansattnummer))
    // Expand the field "personalressurskategori"
    employeeResource.personalressurskategori = resourceCategoryCodes.find(code => code.systemId === employeeResource.personalressurskategori)

    // Find the related azure AD user through extensionAttribute9 match with visma ansattnummer
    let azureADInfo = azureAdPersons.value.find(user => (user.onPremisesExtensionAttributes.extensionAttribute9 && employeeResource.ansattnummer) && (user.onPremisesExtensionAttributes.extensionAttribute9 === employeeResource.ansattnummer))
    
    // If not found through extensionAttribute9, try to find the related azure AD user through upn match with visma kontaktEpostadresse
    if (!azureADInfo) {
      azureADInfo = azureAdPersons.value.find(user => (user.userPrincipalName && employeeResource.kontaktEpostadresse) && (user.userPrincipalName.toLowerCase() === employeeResource.kontaktEpostadresse.toLowerCase()))
    }
    // If not found through upn match - try to find through samAccountName match with visma brukernavn
    if (!azureADInfo) {
      azureADInfo = azureAdPersons.value.find(user => (user.onPremisesSamAccountName && employeeResource.brukernavn) && (user.onPremisesSamAccountName.toLowerCase() === employeeResource.brukernavn.toLowerCase()))
    }

    const aktiveArbeidsforhold = []
    const baked = {
      userPrincipalName: azureADInfo?.userPrincipalName ?? unknownValue, // put on top level - simpler indexing in db
      samAccountName: azureADInfo?.onPremisesSamAccountName ?? unknownValue, // put on top level - simpler indexing in db
      azureAd: azureADInfo,
      navn: `${person.fornavn} ${person.etternavn}`,
      ...person,
      ...employeeResource,
      arbeidsforhold: employeePositions.filter(position => (position.systemId !== unknownValue && employeeResource.arbeidsforhold.includes(position.systemId))).map(forhold => { // Find the employeePositions related to the employeeResource - map the result
        const withOrgInfo = {
          ...forhold,
          stillingskode: employeePositionCodes.find(code => code.systemId === forhold.stillingskode), // Expand the field "stillingskode"
          arbeidssted: getOrgInfo(forhold.arbeidssted) ?? forhold.arbeidssted, // Find the organizationElement related to the employeePosition
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
    baked.mandatoryCompetenceInput = !!mandatoryEmployees.find(emp => emp.userPrincipalName === baked.userPrincipalName) // Check if user must provide input for competence
    return baked
  })
  return bakedPersons
}

const bakeEmployees = async () => {
  const db = mongo()
  // Settings
  let collection = db.collection(mongoDB.settingsCollection)
  const settings = await collection.find({ activeSetting: true }).toArray()

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
  const bakedPersons = bakeEmployeeData(resourceCategoryCodes, employeePositionCodes, employeePersons, employeeResources, employeePositions, organizationElements, azureAdPersons, settings)

  logger('info', ['bakeEmployees', 'Fetching the whole collection from mongo'])
  collection = db.collection(mongoDB.employeeCollection)
  const oldData = await collection.find({}).toArray()
  logger('info', ['bakeEmployees', `Fetched ${oldData.length} elements from Mongo collection`])
  logger('info', ['bakeEmployees', `Comparing old and new data, checking for stale persons, adding fintStatus, and deleting ${deleteAfterInactiveDays} days stale persons`])
  const newData = findPersonDiff(oldData, bakedPersons)
  logger('info', ['bakeEmployees', 'Master chef is done - baking complete!'])
  return newData
}

module.exports = { bakeEmployeeData, bakeEmployees }
