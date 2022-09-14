const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyRoles } = require('../lib/verifyTokenClaims')

const query = { userPrincipalName: { $ne: null }, harAktivtArbeidsforhold: true }
const projection = {
  userPrincipalName: 1,
  fornavn: 1,
  etternavn: 1,
  'aktiveArbeidsforhold.ansettelsesprosent': 1,
  'aktiveArbeidsforhold.hovedstilling': 1,
  'aktiveArbeidsforhold.stillingstittel': 1,
  'aktiveArbeidsforhold.arbeidssted.kortnavn': 1,
  'aktiveArbeidsforhold.arbeidssted.navn': 1,
  'personalressurskategori.navn': 1
}

// prøv ut https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/
module.exports = async function (context, req) {
  // Verify that the users have access to this endpoint
  if (!verifyRoles(req.headers.authorization, [appRoles.admin, appRoles.priveleged])) return { status: 401, body: 'You are not authorized to access this resource' }

  const db = await mongo()
  const collection = db.collection(mongoDB.employeeCollection)
  try {
    const persons = await collection.find(query).project(projection).toArray()
    // const repacked = repack(persons)
    return { status: 200, body: persons }
  } catch (error) {
    return { status: 500, body: error.message }
  }
}
