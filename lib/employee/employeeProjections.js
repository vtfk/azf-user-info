const baseProjection = {
  _id: 0,
  userPrincipalName: 1,
  fornavn: 1,
  etternavn: 1,
  'aktiveArbeidsforhold.hovedstilling': 1,
  'aktiveArbeidsforhold.stillingstittel': 1,
  'aktiveArbeidsforhold.arbeidssted.navn': 1,
  'aktiveArbeidsforhold.arbeidssted.organisasjonsId': 1,
  'aktiveArbeidsforhold.arbeidssted.leder': 1,
  'azureAd.officeLocation': 1,
}

const expandedProjection = {
  _id: 0,
  fodselsnummer: 1,
  userPrincipalName: 1,
  fornavn: 1,
  etternavn: 1,
  samAccountName: 1,
  'azureAd.officeLocation': 1,
  mobilePhone: 1,
  privatEpostadresse: 1,
  bostedsadresse: 1,
  kjonn: 1,
  ansattnummer: 1,
  ansettelsesperiode: 1,
  kontaktEpostadresse: 1,
  tidligereArbeidsforhold: 1,
  personalressurskategori: 1,
  aktiveArbeidsforhold: 1,
  harAktivtArbeidsforhold: 1
}

module.exports = { baseProjection, expandedProjection }
