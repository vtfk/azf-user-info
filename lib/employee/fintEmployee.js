const { fintRequest, repackLinkResource } = require('../fintRequest')
const { logger } = require('@vtfk/logger')
const { unknownValue } = require('../../config')

const getEmployeePersons = async () => {
  const res = await fintRequest('administrasjon/personal/person')
  logger('info', ['fintEmployee', 'employeePerson', `repacking ${res._embedded._entries.length} persons`])
  const persons = res._embedded._entries.map(person => {
    const repacked = {
      fodselsnummer: person.fodselsnummer?.identifikatorverdi ?? unknownValue,
      fornavn: person.navn?.fornavn ?? unknownValue,
      etternavn: person.navn?.etternavn ?? unknownValue,
      privatEpostadresse: person.kontaktinformasjon?.epostadresse ?? unknownValue,
      bostedsadresse: person.bostedsadresse ?? unknownValue,
      kjonn: repackLinkResource(person._links?.kjonn, '1') ?? unknownValue,
      ansattnummer: repackLinkResource(person._links?.personalressurs, '1') ?? unknownValue
    }
    return repacked
  })
  return persons
}

const getEmployeeResources = async () => {
  const res = await fintRequest('administrasjon/personal/personalressurs')
  logger('info', ['fintEmployee', 'employeeResource', `repacking ${res._embedded._entries.length} resources`])
  const resources = res._embedded._entries.map(resource => {
    const repacked = {
      ansattnummer: resource.ansattnummer?.identifikatorverdi ?? unknownValue,
      ansettelsesperiode: {
        start: resource.ansettelsesperiode?.start ?? unknownValue,
        slutt: resource.ansettelsesperiode?.slutt ?? unknownValue
      },
      brukernavn: resource.brukernavn?.identifikatorverdi ?? unknownValue,
      kontaktEpostadresse: resource.kontaktinformasjon?.epostadresse ?? unknownValue,
      ansiennitet: resource.ansiennitet ?? unknownValue,
      arbeidsforhold: repackLinkResource(resource._links?.arbeidsforhold) ?? [],
      personalressurskategori: repackLinkResource(resource._links?.personalressurskategori, '1') ?? unknownValue
    }
    return repacked
  })
  return resources
}

const getEmployeePositions = async () => {
  const res = await fintRequest('administrasjon/personal/arbeidsforhold')
  logger('info', ['fintEmployee', 'employeePositions', `repacking ${res._embedded._entries.length} positions`])
  const positions = res._embedded._entries.map(position => {
    const repacked = {
      systemId: position.systemId?.identifikatorverdi ?? unknownValue,
      ansettelsesprosent: position.ansettelsesprosent ?? unknownValue,
      arbeidsforholdsperiode: {
        start: position.arbeidsforholdsperiode?.start ?? unknownValue,
        slutt: position.arbeidsforholdsperiode?.slutt ?? unknownValue
      },
      gyldighetsperiode: {
        start: position.gyldighetsperiode?.start ?? unknownValue,
        slutt: position.gyldighetsperiode?.slutt ?? unknownValue
      },
      hovedstilling: position.hovedstilling ?? unknownValue,
      stillingsnummer: position.stillingsnummer ?? unknownValue,
      stillingstittel: position.stillingstittel ?? unknownValue,
      arbeidsforholdstype: repackLinkResource(position._links?.arbeidsforholdstype, '1') ?? unknownValue,
      stillingskode: repackLinkResource(position._links?.stillingskode, '1') ?? unknownValue,
      arbeidssted: repackLinkResource(position._links?.arbeidssted, '1') ?? unknownValue,
      ansvar: repackLinkResource(position._links?.ansvar, '1') ?? unknownValue,
      funksjon: repackLinkResource(position._links?.funksjon, '1') ?? unknownValue,
      prosjekt: repackLinkResource(position._links?.prosjekt, '1') ?? unknownValue
    }
    return repacked
  })
  return positions
}

const getOrganizationElements = async () => {
  const res = await fintRequest('administrasjon/organisasjon/organisasjonselement')
  logger('info', ['fintEmployee', 'getOrganizationElements', `repacking ${res._embedded._entries.length} organization elements`])
  const orgElements = res._embedded._entries.map(element => {
    const repacked = {
      organisasjonsId: element.organisasjonsId?.identifikatorverdi ?? unknownValue,
      kortnavn: element.kortnavn ?? unknownValue,
      navn: element.navn ?? unknownValue,
      organisasjonsnummer: element.organisasjonsnummer?.identifikatorverdi ?? unknownValue,
      organisasjonsKode: element.organisasjonsKode?.identifikatorverdi ?? unknownValue
    }
    return repacked
  })
  return orgElements
}

const getResourceCategoryCodes = async () => {
  const res = await fintRequest('administrasjon/kodeverk/personalressurskategori')
  logger('info', ['fintEmployee', 'getResourceCategoryCodes', `repacking ${res._embedded._entries.length} codes`])
  const codes = res._embedded._entries.map(code => {
    const repacked = {
      systemId: code.systemId?.identifikatorverdi ?? unknownValue,
      kode: code.kode ?? unknownValue,
      navn: code.navn ?? unknownValue
    }
    return repacked
  })
  return codes
}

const getEmployeepositionCodes = async () => {
  const res = await fintRequest('administrasjon/kodeverk/stillingskode')
  logger('info', ['fintEmployee', 'getEmployeepositionCodes', `repacking ${res._embedded._entries.length} codes`])
  const codes = res._embedded._entries.map(code => {
    const repacked = {
      systemId: code.systemId?.identifikatorverdi ?? unknownValue,
      kode: code.kode ?? unknownValue,
      navn: code.navn ?? unknownValue
    }
    return repacked
  })
  return codes
}

module.exports = { getResourceCategoryCodes, getEmployeepositionCodes, getEmployeePersons, getEmployeeResources, getEmployeePositions, getOrganizationElements }
