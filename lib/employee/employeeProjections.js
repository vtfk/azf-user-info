const nameSearchProjection = {
  _id: 0,
  ansattnummer: 1,
  navn: 1,
  'aktiveArbeidsforhold.hovedstilling': 1,
  'aktiveArbeidsforhold.stillingstittel': 1,
  'aktiveArbeidsforhold.arbeidssted.navn': 1,
}


const employeeProjection = {
  _id: 0,
  fodselsnummer: 1,
  userPrincipalName: 1,
  fornavn: 1,
  etternavn: 1,
  navn: 1,
  samAccountName: 1,
  'azureAd.officeLocation': 1,
  'azureAd.city': 1,
  mobilePhone: 1,
  privatEpostadresse: 1,
  bostedsadresse: 1,
  kjonn: 1,
  ansattnummer: 1,
  ansettelsesperiode: 1,
  kontaktEpostadresse: 1,
  personalressurskategori: 1,
  aktiveArbeidsforhold: 1,
  harAktivtArbeidsforhold: 1,
  mandatoryCompetenceInput: 1
}


// Not in use anymore
const baseProjection = {
  userPrincipalName: 1,
  fornavn: 1,
  etternavn: 1,
  navn: 1,
  ansattnummer: 1,
  'aktiveArbeidsforhold.hovedstilling': 1,
  'aktiveArbeidsforhold.stillingstittel': 1,
  'aktiveArbeidsforhold.arbeidssted.navn': 1,
  'aktiveArbeidsforhold.arbeidssted.organisasjonsId': 1,
  'aktiveArbeidsforhold.arbeidssted.leder': 1,
  'aktiveArbeidsforhold.arbeidssted.struktur': 1,
  'azureAd.officeLocation': 1,
  'azureAd.city': 1,
  harAktivtArbeidsforhold: 1,
}

// If not privileged - filter out data
const filterEmployeeData = (data) => {
  const azureAd = data.azureAd ? { officeLocation: data.azureAd.officeLocation, city: data.azureAd.city } : { officeLocation: null, city: null }
  return {
    userPrincipalName: data.userPrincipalName,
    fornavn: data.fornavn,
    etternavn: data.etternavn,
    navn: data.navn,
    samAccountName: data.samAccountName,
    azureAd,
    ansattnummer: data.ansattnummer,
    ansettelsesperiode: data.ansettelsesperiode,
    personalressurskategori: data.personalressurskategori,
    aktiveArbeidsforhold: data.aktiveArbeidsforhold,
    harAktivtArbeidsforhold: data.harAktivtArbeidsforhold
  }
}

module.exports = { filterEmployeeData, employeeProjection, nameSearchProjection }
