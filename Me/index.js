const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')
const { verifyToken } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')
const { employeeProjection, repackArbeidsforhold } = require('../lib/employee/employeeProjections')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - GetMe',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  logger('info', ['new request - validating upn'])
  // Verify token
  const ver = verifyToken(req.headers.authorization)
  if (!ver.verified) return { status: 401, body: `You are not authorized to view this resource, ${ver.msg}` }

  const db = mongo()
  let collection = db.collection(mongoDB.employeeCollection)
  let res = {}
  try {
    const employeeData = await collection.find({ userPrincipalName: ver.upn }).project(employeeProjection).toArray()
    if (employeeData.length === 0) {
      return { status: 404, body: `No users found with "userPrincipalName": "${ver.upn}"` }
    }
    res = { ...repackArbeidsforhold(employeeData)[0] } // Changes arbeidsforholdstype to relevant name
  } catch (error) {
    return { status: 500, body: error.message }
  }
  try {
    collection = db.collection(mongoDB.competenceCollection)
    const competenceData = await collection.find({ fodselsnummer: res.fodselsnummer }).project({ _id: 0 }).toArray()
    if (competenceData.length === 0) {
      res.competenceData = {
        fodselsnummer: res.fodselsnummer
      }
    } else {
      logger('info', [ver.upn, `Found competence data for user "${ver.upn}"`])
      res.competenceData = competenceData[0]
    }
  } catch (error) {
    await logger('error', [ver.upn, error.message])
    return { status: 500, body: error.message }
  }

  return { status: 200, body: res }
}
