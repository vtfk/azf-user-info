const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyToken } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')


module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - Critical Tasks',
    azure: {
      context,
      excludeInvocationId: true
    }
  })

  const unit = context.bindingData.param.toString()
  logger('info', ['checking that unit id is provided', unit])
  // Verify token
  const ver = verifyToken(req.headers.authorization)
  if (!ver.verified) return { status: 401, body: `You are not authorized to view this resource, ${ver.msg}` }
  
  const privileged = ver.roles.includes(appRoles.admin)
  logger('info', ['checked if has privileged role - result', privileged])
  if (!privileged) return { status: 401, body: `You do not have sufficient permissions to use this resource` }

  const db = mongo()
  const collection = db.collection(mongoDB.criticalTasksCollection)

  if (req.method === 'GET') {
    try {
      logger('info', ["Trying to GET critical tasks"])
      const getRes = await collection.find({ unitId: unit }).toArray()
      return { status: 200, body: getRes }
    } catch (error) {
      return { status: 500, body: error.message }
    }
  } else if (req.method === 'POST') {
    try {
      logger('info', ["Trying to update critical tasks"])
      const upsertRes = await collection.findOneAndReplace({ unitId: unit }, { ...req.body}, { upsert: true })
      return { status: 200, body: upsertRes }
    } catch (error) {
      return { status: 500, body: error.message }
    }
  } else {
    return { status: 400, body: "Not a legal method" }
  }
}