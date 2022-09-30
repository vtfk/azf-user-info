const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyRoles } = require('../lib/verifyTokenClaims')
const jwt = require('jsonwebtoken')
const { logger, logConfig } = require('@vtfk/logger')
const { expandedProjection } = require('../lib/employee/employeeProjections')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - GetMe',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  // Verify that the users have access to this endpoint
  if (!req.headers.authorization) return { status: 401, body: 'You are not authorized to access this resource' }
  if (typeof req.headers.authorization !== 'string') return { status: 401, body: 'Access token is not valid' }
  const { upn } = jwt.decode(req.headers.authorization.replace('Bearer ', ''))
  if (!upn) return { status: 401, body: 'You do not have UPN - whaaaat?' }

  const db = await mongo()
  let collection = db.collection(mongoDB.employeeCollection)
  let res = {}
  try {
    const employeeData = await collection.find({ userPrincipalName: upn }).project(expandedProjection).toArray()
    if (employeeData.length === 0) {
      return { status: 404, body: `No users found with "userPrincipalName": "${upn}"` }
    }
    res = { ...employeeData[0] }
  } catch (error) {
    return { status: 500, body: error.message }
  }
  try {
    collection = db.collection(mongoDB.competenceCollection)
    const competenceData = await collection.find({ fodselsnummer: res.fodselsnummer }).project({ _id: 0 }).toArray()
    if (competenceData.length === 0) {
      res.competenceData = {}
    } else {
      logger('info', [`Found competence data for user "${upn}"`])
      res.competenceData = competenceData[0]
    }
  } catch (error) {
    logger('error', error.message)
    return { status: 500, body: error.message }
  }
  return { status: 200, body: res }
}
