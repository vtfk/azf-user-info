const mongo = require('../mongo')
const { mongoDB } = require('../../config')

const query = { userPrincipalName: { $ne: null }, harAktivtArbeidsforhold: true }
const projection = {
  userPrincipalName: 1,
  fornavn: 1,
  etternavn: 1,
  ansattnummer: 1,
  'aktiveArbeidsforhold.systemId': 1,
  'aktiveArbeidsforhold.ansettelsesprosent': 1,
  'aktiveArbeidsforhold.hovedstilling': 1,
  'aktiveArbeidsforhold.stillingstittel': 1,
  'aktiveArbeidsforhold.stillingsnummer': 1,
  'personalressurskategori.navn': 1,
  'aktiveArbeidsforhold.lonnsprosent': 1
}

module.exports = async () => {
  const db = await mongo()
  const collection = db.collection(mongoDB.employeeCollection)
  const persons = await collection.find(query).project(projection).toArray()
  return persons
}
