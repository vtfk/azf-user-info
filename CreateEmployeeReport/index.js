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

  return { status: 200, body: { littData: "hallo", littmer: "funker det???", nesta: { tut: "burt" } } }
}
