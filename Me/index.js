const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyRoles } = require('../lib/verifyTokenClaims')
const jwt = require('jsonwebtoken')

module.exports = async function (context, req) {
    // Verify that the users have access to this endpoint
  if (!req.headers.authorization) return { status: 401, body: 'You are not authorized to access this resource' }
  if (typeof req.headers.authorization !== 'string') return { status: 401, body: 'Access token is not valid' }
    const { upn } = jwt.decode(req.headers.authorization.replace('Bearer ', ''))
    if (!upn) return { status: 401, body: 'You do not have UPN - whaaaat?' }

  const db = await mongo()
  const collection = db.collection(mongoDB.employeeCollection)
  try {
    const filteredDocs = await collection.find({ userPrincipalName: upn }).toArray()
    if (filteredDocs.length === 0) {
      return { status: 404, body: `No users found with "userPrincipalName": "${upn}"` }
    }
    return { status: 200, body: filteredDocs[0] }
  } catch (error) {
    return { status: 500, body: error.message }
  }
}