const { fintRequest, repackLinkResource } = require('../fintRequest')
const { logger } = require('@vtfk/logger')
const { unknownValue } = require('../../config')

const getOrganizationElements = async () => {
  const res = await fintRequest('administrasjon/organisasjon/organisasjonselement')
  logger('info', ['fintOrg', 'getOrganizationElements', `repacking ${res._embedded._entries.length} organization elements`])
  const orgElements = res._embedded._entries.map(element => {
    const repacked = {
      organisasjonsId: element.organisasjonsId?.identifikatorverdi ?? unknownValue,
      kortnavn: element.kortnavn ?? unknownValue,
      navn: element.navn ?? unknownValue,
      organisasjonsnummer: element.organisasjonsnummer?.identifikatorverdi ?? unknownValue,
      organisasjonsKode: element.organisasjonsKode?.identifikatorverdi ?? unknownValue,
      gyldighetsperiode: {
        start: element.gyldighetsperiode?.start ?? unknownValue,
        slutt: element.gyldighetsperiode?.slutt ?? unknownValue
      },
      leder: repackLinkResource(element._links?.leder, '1') ?? unknownValue,
      overordnet: repackLinkResource(element._links?.overordnet, '1') ?? unknownValue,
      underordnet: repackLinkResource(element._links?.underordnet) ?? [],
      arbeidsforhold: repackLinkResource(element._links?.arbeidsforhold) ?? []
    }
    return repacked
  })
  return orgElements
}

module.exports = { getOrganizationElements }
