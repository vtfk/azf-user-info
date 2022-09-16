const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyRoles } = require('../lib/verifyTokenClaims')
const { logger, logConfig } = require('@vtfk/logger')
const { baseProjection, expandedProjection, pipelainen } = require('../lib/employee/employeeProjections')

const determineParam = (id) => {
  const emailRegex = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])")
  if (id.length === 11 && !isNaN(id)) { // SSN
    return { prop: 'fodselsnummer', value: id }
  } else if (emailRegex.test(id)) {
    return { prop: 'userPrincipalName', value: id }
  } else if (typeof id === 'string' && id.length < 50) {
    return { prop: 'samAccountName', value: id }
  } else {
    return undefined
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
  if (verifyRoles(req.headers.authorization, [appRoles.admin, appRoles.priveleged])) {
    // Expanded projection
    projection = expandedProjection
    logger('info', ['roles validated - will use expanded projection data', projection])
  } else {
    logger('info', ['roles not present - will use base projection data', projection])
  }

  if (!req.params.id) return { status: 400, body: 'Please specify query param {id} with an ssn, upn, or samAccountName' }
  const query = determineParam(req.params.id)
  if (!query) return { status: 400, body: 'Please specify VALID query param {id} with an ssn, upn, or samAccountName' }

  logger('info', [`running query for ${query.prop}: "${query.value}"`])
  const db = await mongo()
  let collection = db.collection(mongoDB.employeeCollection)
  let res = {}
  try {
    const employeeData = await collection.find({ [query.prop]: query.value }).project(projection).toArray()
    if (employeeData.length === 0) {
      logger('info', [`No users found with "${query.prop}: "${query.value}"`])
      return { status: 404, body: `No users found with ${query.prop}: "${query.value}"` }
    }
    logger('info', [`Found employee data for user ${query.prop}: "${query.value}"`])
    res = { ...employeeData[0] }
  } catch (error) {
    logger('error', error.message)
    return { status: 500, body: error.message }
  }
  try {
    collection = db.collection(mongoDB.competenceCollection)
    const competenceData = await collection.find({ fodselsnummer: res.fodselsnummer }).toArray()
    if (competenceData.length === 0) {
      res.competenceData = null
    } else {
      logger('info', [`Found competence data for user ${query.prop}: "${query.value}"`])
      res.competenceData = competenceData[0]
    }
  } catch (error) {
    logger('error', error.message)
    return { status: 500, body: error.message }
  }
  return { status: 200, body: res }
}
