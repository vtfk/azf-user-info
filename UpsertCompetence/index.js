const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')
const { verifyToken } = require('../lib/verifyToken')

module.exports = async function (context, req) {
  // Verify token
  const ver = verifyToken(req.headers.authorization)
  if (!ver.verified) return { status: 401, body: `You are not authorized to view this resource, ${ver.msg}` }

  if (typeof req.body !== 'object') return { status: 400, body: 'That is not an object body' }
  if (!req.body.fodselsnummer) return { status: 400, body: 'Missing required parameter "fodselsnummer"' }
  const db = mongo()
  const collection = db.collection(mongoDB.competenceCollection)
  try {
    const upsertRes = await collection.replaceOne({ fodselsnummer: req.body.fodselsnummer, userPrincipalName: ver.upn }, { ...req.body, userPrincipalName: ver.upn, timestamp: new Date().toISOString() }, { upsert: true })
    return { status: 200, body: upsertRes }
  } catch (error) {
    console.log(error)
    return { status: 500, body: error.message }
  }
}
