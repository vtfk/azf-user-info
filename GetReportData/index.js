const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyRoles } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - GetReportData',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  logger('info', ['new request - validating roles'])

  return { status: 500, body: 'Endpoint not in use anymore, remember to delete it, jorgen and robin' }

  // Verify that the users have access to this endpoint
  if (verifyRoles(req.headers.authorization, [appRoles.admin, appRoles.privileged])) {
    logger('info', ['roles validated'])
  } else {
    logger('info', ['roles not present - not authorized'])
    return { status: 401, body: 'You are not authorized to access this resource' }
  }

  logger('info', ['running query for report data'])
  const db = mongo()
  const collection = db.collection(mongoDB.reportCollection)
  try {
    const reportData = await collection.find({}).toArray()
    return { status: 200, body: reportData }
  } catch (error) {
    logger('error', error.message)
    return { status: 500, body: error.message }
  }
}
