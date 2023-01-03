const mongo = require('../lib/mongo')
const { mongoDB, appRoles, leaderLevel } = require('../config')
const { verifyAppToken } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')


module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - CreateEmployeeReport',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  logger('info', ['new request - validating roles and appid'])
  // Verify token
  const ver = verifyAppToken(req.headers.authorization)
  if (!ver.verified) return { status: 401, body: `You are not authorized to view this resource, ${ver.msg}` }
  
  const hasAccess = ver.roles.includes(appRoles.applicationRead)
  await logger('info', [ver.appid, 'checked if has privileged role - result', hasAccess])
  if (!hasAccess) return { status: 401, body: `You are not authorized to view this resource, required role missing` }

  if (!req.body) return { status: 400, body: 'body is required' }
  const { managerUpn, employeeUpn } = req.body

  await logger('info', [ver.appid, 'this is the body', JSON.stringify(req.body), req.body])

  if (!managerUpn) return { status: 400, body: 'Missing required parameter "managerUpn"' }
  if (!employeeUpn) return { status: 400, body: 'Missing required parameter "employeeUpn"' }

  return { status: 200, body: { managerUpn, employeeUpn } }

  /*
  const { upn, ssn, fullName } = req.body

  if (!upn || !fullName) return { status: 400, body: 'Missing required parameter "upn" or "fullName"' }
  if (!ssn) return { status: 400, body: 'Missing required parameter "ssn"' }

  const db = mongo()
  let collection = db.collection(mongoDB.employeeCollection)
  let query = { "$or": { "navn": (fullName || 'ingen som heter detta her da'), "userPrincipalName": (upn || 'detta her er ikke et upn') }, "fodselsnummer": ssn }
  const employee = await collection.find({  }).toArray()

  return { status: 200, body: { littData: "hallo", littmer: "funker det???", nesta: { tut: "burt" } } }
  */
}
