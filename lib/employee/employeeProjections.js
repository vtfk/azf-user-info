const { mongoDB } = require('../../config')

const baseProjection = {
  userPrincipalName: 1,
  fornavn: 1,
  etternavn: 1,
  'aktiveArbeidsforhold.hovedstilling': 1,
  'aktiveArbeidsforhold.stillingstittel': 1,
  'aktiveArbeidsforhold.arbeidssted.navn': 1,
  'azureAd.manager.displayName': 1,
  'azureAd.officeLocation': 1,
  'azureAd.manager.userPrincipalName': 1
}

const expandedProjection = {
  fodselsnummer: 1,
  userPrincipalName: 1,
  fornavn: 1,
  etternavn: 1,
  samAccountName: 1,
  'azureAd.manager.displayName': 1,
  'azureAd.officeLocation': 1,
  'azureAd.manager.userPrincipalName': 1,
  mobilePhone: 1,
  privatEpostadresse: 1,
  bostedsadresse: 1,
  kjonn: 1,
  ansattnummer: 1,
  ansattelsesperiode: 1,
  kontaktEpostadresse: 1,
  tidligereArbeidsforhold: 1,
  personalressurskategori: 1,
  aktiveArbeidsforhold: 1,
  harAktivtArbeidsforhold: 1
}

const pipelainen = [
  {
    $lookup: {
      from: mongoDB.competenceCollection,
      localField: 'fodselsnummer',
      foreignField: 'fodselsnummer',
      as: mongoDB.competenceCollection
    }
  }
]
module.exports = { baseProjection, expandedProjection, pipelainen }
