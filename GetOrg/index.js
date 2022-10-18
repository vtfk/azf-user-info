const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')
const { verifyUpn } = require('../lib/verifyTokenClaims')

module.exports = async function (context, req) {
  if (!req.headers.authorization) return { status: 401, body: 'Missing access token' }
  const verUpn = verifyUpn(req.headers.authorization)
  if (!verUpn) return { status: 401, body: 'You are not authorized to view this resource, upn suffix is not authorized' }
  const db = mongo()
  const collection = db.collection(mongoDB.orgCollection)
  const projection = {
    _id: 0,
    kortnavn: 1,
    navn: 1,
    etternavn: 1,
    organisasjonsnummer: 1,
    'arbeidsforhold.navn': 1,
    'arbeidsforhold.userPrincipalName': 1,
    'arbeidsforhold.ansettelsesprosent': 1,
    'arbeidsforhold.lonnsprosent': 1,
    'arbeidsforhold.hovedstilling': 1,
    'arbeidsforhold.stillingsnummer': 1,
    'arbeidsforhold.stillingstittel': 1,
    'arbeidsforhold.ansettelsesprosent': 1,
    'arbeidsforhold.personalressurskategori': 1
  }

  try {
    const org = await collection.find({}).project(projection).toArray()
    // const repacked = repack(persons)
    return { status: 200, body: org }
  } catch (error) {
    return { status: 500, body: error.message }
  }
}
