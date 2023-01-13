const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyAppToken } = require('../lib/verifyToken')
const { verifyInput } = require('../lib/acosReportTypes')
const { logger, logConfig } = require('@vtfk/logger')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - CreateAcosReport',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  logger('info', ['new request - validating roles and appid'])
  // Verify token
  const ver = verifyAppToken(req.headers.authorization)
  if (!ver.verified) {
    return {
      status: 401,
      body: `You are not authorized to view this resource, ${ver.msg}`
    }
  }

  const hasAccess = ver.roles.includes(appRoles.applicationRead)
  logger('info', [ver.appid, 'checked if has privileged role - result', hasAccess])
  if (!hasAccess) {
    return {
      status: 401,
      body: 'You are not authorized to view this resource, required role missing'
    }
  }

  try {
    verifyInput(req.body)
  } catch (error) {
    logger('error', [ver.appid, 'Input is not valid', error])
    return { status: 400, body: error.toString() }
  }

  try {
    const db = mongo()
    let collection = db.collection(mongoDB.acosReportCollection)
    const insertRes = await collection.insertOne(req.body)
    return { status: 200, body: insertRes }
  } catch (error) {
    return { status: 500, body: error.toString() }
  }
}