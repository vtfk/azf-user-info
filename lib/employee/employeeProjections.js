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
/*
"T",Timelønnet m/arb.avt
	"TI", Tidsavgrenset
	"FA", Fast ansatt
	"MA", Midlertidig aml14.9. a
	"PU", Perm uten lønn
	"ML", Midlertidig oppl l 10-6
	"F", Folkevalgt
	null,
	"MB", Midlertidig aml14.9. b
	"PV", Eng pensjonistvilkår
	"MV", Midl. oppl.l.§10-6a
	"MD", "Midl. aml§14-9(2) d"
	"MC","Midl. aml§14-9(2) c"
	"TV", Tillitsvalgt
	"FU", Fast delvis ufør
	"X", sluttet
	"FP", fast delvis afp
	"GA", gavepensjon
	"FM", fast midl ufør aap
	"MK", midlertidig konstituert
	"MF",Midlertidig aml14.9(2). f
	"UL", uoppsigelig lærer
	"PM", perm med lønn
	"AP", fast ansatt deliv aap
	"AT", fast ansatt 100% aap
	"FV", fast varig ufør
	"XX", sluttavtale
	"U", uførepensjon
	"FD" fast ans/delv alder
*/
/*
"MD" "Midl. aml§14-9(2) d",
MB midlertidig
PU",Perm u/lønn
PM permisjon
V vikar
PF permisjon
MC midlertidig
MA midlertidig
MK Konstituert
M midlertidig
MF midlertidig
KS konstituert
ME midlertidig
*/

const midlertidigCodes = ['MB', 'MD', 'MC', 'MA', 'M', 'MF', 'ME']
const permisjonCodes = ['PU', 'PM', 'PF']
const konstituertCodes = ['MK', 'KS']

const getArbeidsforholdsType = (arbeidsforholdstype) => {
  if (!arbeidsforholdstype) return 'ikkeRelevant'
  if (midlertidigCodes.includes(arbeidsforholdstype.toUpperCase())) return 'Midlertidig'
  if (permisjonCodes.includes(arbeidsforholdstype.toUpperCase())) return 'Permisjon'
  if (konstituertCodes.includes(arbeidsforholdstype.toUpperCase())) return 'Konstituert'
  return 'ikkeRelevant'
}

const repackArbeidsforhold = (employees) => {
  const repacked = employees.map(emp => {
    return {
      ...emp,
      aktiveArbeidsforhold: emp.aktiveArbeidsforhold.map(forhold => {
        return {
          ...forhold,
          arbeidsforholdstype: getArbeidsforholdsType(forhold.arbeidsforholdstype)
        }
      })
    }
  })
  return repacked
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

module.exports = { filterEmployeeData, repackArbeidsforhold, employeeProjection, nameSearchProjection, getArbeidsforholdsType }
