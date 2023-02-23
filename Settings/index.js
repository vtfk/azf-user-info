const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyToken } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - Settings',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  // Verify token
  const ver = verifyToken(req.headers.authorization)
  if (!ver.verified) return { status: 401, body: `You are not authorized to view this resource, ${ver.msg}` }

  const privileged = ver.roles.includes(appRoles.admin)
  logger('info', ['checked if has privileged role - result', privileged])
  if (!privileged) return { status: 401, body: 'You do not have sufficient permissions to use this resource' }

  const db = mongo()
  let collection = db.collection(mongoDB.settingsCollection)

  if (req.method === 'GET') {
    try {
      logger('info', ['Trying to GET settings'])
      const getRes = await collection.find({ activeSetting: true }).toArray()
      return { status: 200, body: getRes }
    } catch (error) {
      return { status: 500, body: error.message }
    }
  } else if (req.method === 'POST') {
    try {
      logger('info', ['Trying to update settings'])
      // Innplassering
      if (req.body.innplassering && !req.body.oblig) {
        const { ansattnummer, method, upn, name } = req.body
        collection = db.collection(mongoDB.innplasseringCollection)
        if (method === 'get') {
          const innplassering = await collection.find({}).toArray()
          return { status: 200, body: innplassering }
        }
        if (!ansattnummer && !method) return { status: 400, body: 'missing required params "ansattnummer" and "method"'}
        if (method === "add") {
          const addResult = await collection.replaceOne({ ansattnummer: ansattnummer }, { ansattnummer, upn, name, timestamp: new Date().toISOString(), enabled: true, modifiedBy: ver.upn }, { upsert: true })
          return { status: 200, body: addResult }
        } else if (method === "remove") {
          const updateResult = await collection.update({ ansattnummer: ansattnummer }, { $set: { enabled: false , timestamp: new Date().toISOString(), modifiedBy: ver.upn } })
          return { status: 200, body: updateResult }
        }
      // Regular settings
      } else {
        if (!req.body.oblig) return { status: 400, body: 'Missing required param "body"' }
        const upsertRes = await collection.replaceOne({ activeSetting: true }, { ...req.body, activeSetting: true }, { upsert: true })
        return { status: 200, body: upsertRes }
      }
    } catch (error) {
      return { status: 500, body: error.message }
    }
  } else {
    return { status: 400, body: 'Not a legal method' }
  }
}
