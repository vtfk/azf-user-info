const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')
const { verifyToken } = require('../lib/verifyToken')
const { logConfig, logger } = require('@vtfk/logger')

const orgProjection = {
  _id: 0,
  organisasjonsId: 1,
  kortnavn: 1,
  navn: 1,
  etternavn: 1,
  organisasjonsnummer: 1,
  leder: 1,
  overordnet: 1,
  'arbeidsforhold.navn': 1,
  'arbeidsforhold.userPrincipalName': 1,
  'arbeidsforhold.ansettelsesprosent': 1,
  'arbeidsforhold.lonnsprosent': 1,
  'arbeidsforhold.hovedstilling': 1,
  'arbeidsforhold.stillingsnummer': 1,
  'arbeidsforhold.stillingstittel': 1,
  'arbeidsforhold.ansettelsesprosent': 1,
  'arbeidsforhold.personalressurskategori': 1,
  'arbeidsforhold.officeLocation': 1
}

const determineParam = (param) => {
  const emailRegex = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])")
  if (!isNaN(param)) { // orgid
    return { query:  { 'organisasjonsId': param }, searchProjection: orgProjection, type: 'unique' }
  } else if (emailRegex.test(param)) {
    return { query: { 'arbeidsforhold.userPrincipalName': param }, searchProjection: orgProjection, type: 'unique' }
  } else if (param.toLowerCase() === 'all') {
  return { query: {}, searchProjection: orgProjection, type: 'all' }
  } else {
    return { query: { navn: {'$regex' : param, '$options' : 'i'} }, searchProjection: orgProjection, type: 'search' }
  }
}

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - GetEmployee',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  logger('info', ['new request - validating roles and upn'])
  // Verify token
  const ver = verifyToken(req.headers.authorization)
  if (!ver.verified) return { status: 401, body: `You are not authorized to view this resource, ${ver.msg}` }

  const { query, searchProjection, type } = determineParam(req.params.param)

  const db = mongo()
  const collection = db.collection(mongoDB.orgCollection)

  try {
    const org = await collection.find(query).project(searchProjection).toArray()
    // const repacked = repack(persons)
    return { status: 200, body: org }
  } catch (error) {
    return { status: 500, body: error.message }
  }
}
