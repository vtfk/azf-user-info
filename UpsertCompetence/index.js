const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')
const jwt = require('jsonwebtoken')

module.exports = async function (context, req) {
  // Verify that the users have access to this endpoint
  if (!req.headers.authorization) return { status: 401, body: 'You are not authorized to access this resource' }
  if (typeof req.headers.authorization !== 'string') return { status: 401, body: 'Access token is not valid' }
  const { upn } = jwt.decode(req.headers.authorization.replace('Bearer ', ''))
  if (!upn) return { status: 401, body: 'You do not have UPN - whaaaat?' }

  if (typeof req.body !== 'object') return { status: 400, body: 'That is not an object body' }
  if (!req.body.fodselsnummer) return { status: 400, body: 'Missing required parameter "fodselsnummer"' }
  const db = await mongo()
  const collection = db.collection(mongoDB.competenceCollection)
  try {
    const upsertRes = await collection.replaceOne({ fodselsnummer: req.body.fodselsnummer, userPrincipalName: upn }, { ...req.body, userPrincipalName: upn }, { upsert: true })
    return { status: 200, body: upsertRes }
  } catch (error) {
    console.log(error)
    return { status: 500, body: error.message }
  }
}
