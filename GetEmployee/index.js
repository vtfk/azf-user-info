const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyRoles } = require('../lib/verifyTokenClaims')
const { logger, logConfig } = require('@vtfk/logger')
const { baseProjection, expandedProjection, nameSearchProjection } = require('../lib/employee/employeeProjections')

const determineParam = (id) => {
  const emailRegex = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])")
  const samAccountRegex = new RegExp("[a-z]{2,3}[0-9]{4,5}")
  if (id.length === 11 && !isNaN(id)) { // SSN
    return { query:  { 'fodselsnummer': id, harAktivtArbeidsforhold: true } }
  } else if (id.length < 10 && !isNaN(id)) {
    return { query: { 'ansattnummer': id, harAktivtArbeidsforhold: true } }
  } else if (emailRegex.test(id)) {
    return { query: { 'userPrincipalName': id, harAktivtArbeidsforhold: true } }
  } else if (samAccountRegex.test(id)) {
    return { query: { 'samAccountName': id, harAktivtArbeidsforhold: true } }
  } else {
    return { query: { navn: {'$regex' : id, '$options' : 'i'}, harAktivtArbeidsforhold: true }, searchProjection: nameSearchProjection }
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
  logger('info', ['new request - validating roles'])

  // Base projection
  let projection = baseProjection
  // Verify that the users have access to this endpoint
  const priveleged = verifyRoles(req.headers.authorization, [appRoles.admin, appRoles.priveleged])
  if (priveleged) {
    // Expanded projection
    projection = expandedProjection
    logger('info', ['roles validated - will use expanded projection data'])
  } else {
    logger('info', ['roles not present - will use base projection data'])
  }

  if (!req.params.id) return { status: 400, body: 'Please specify query param {id} with an ssn, upn, samAccountName, ansattnummer, or name' }
  const { query, searchProjection } = determineParam(req.params.id)
  if (!query) return { status: 400, body: 'Please specify VALID query param {id} with an ssn, upn, samAccountName, ansattnummer, or name' }

  // Check if can use ssn as query
  if (priveleged && query.fodselsnummer) return { status: 401, body: 'You are not authorized to use ssn as query' }

  // Override projection if it the query is a partial search query
  if (searchProjection) projection = searchProjection

  logger('info', [`running query for`, query])
  const db = mongo()
  let collection = db.collection(mongoDB.employeeCollection)
  let res = {}
  try {
    const employeeData = await collection.find(query).limit(10).project(projection).toArray()
    if (employeeData.length === 0) {
      logger('info', ["No users found with", query])
      return { status: 404, body: `No users found with "${JSON.stringify(query)}"` }
    }
    logger('info', [`Found employee data for user`, query])
    res = employeeData
  } catch (error) {
    logger('error', error.message)
    return { status: 500, body: error.message }
  }
  if (searchProjection) {
    logger('info', [`Using searchProjection`, query, 'do not need competence data'])
    return { status: 200, body: res }
  } else if (!priveleged) {
    logger('info', [`Not privileged`, query, 'do not need competence data'])
    return { status: 200, body: { ...res[0] } }
  }

  // If privileged and specific query we expand with competence data
  try {
    res = { ...res[0] }
    collection = db.collection(mongoDB.competenceCollection)
    const competenceData = await collection.find({ fodselsnummer: res.fodselsnummer }).project({ _id: 0 }).toArray()
    if (competenceData.length === 0) {
      res.competenceData = null
    } else {
      logger('info', [`Found competence data for user`, query])
      res.competenceData = competenceData[0]
    }
  } catch (error) {
    logger('error', error.message)
    return { status: 500, body: error.message }
  }
  return { status: 200, body: res }
}
