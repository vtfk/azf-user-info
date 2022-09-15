const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyRoles } = require('../lib/verifyTokenClaims')

const determineParam = (id) => {
  const emailRegex = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])")
  if (id.length === 11 && !isNaN(id)) { // SSN
    return { prop: 'fodselsnummer', value: id }
  } else if (emailRegex.test(id)) {
    return { prop: 'userPrincipalName', value: id }
  } else if (typeof id === 'string' && id.length < 50) {
    return { prop: 'samAccountName', value: id }
  } else {
    return undefined
  }
}

module.exports = async function (context, req) {
  // Verify that the users have access to this endpoint
  if (!verifyRoles(req.headers.authorization, [appRoles.admin, appRoles.priveleged])) return { status: 401, body: 'You are not authorized to access this resource' }

  if (!req.params.id) return { status: 400, body: 'Please specify query param {id} with an ssn, upn, or samAccountName' }
  const query = determineParam(req.params.id)
  if (!query) return { status: 400, body: 'Please specify VALID query param {id} with an ssn, upn, or samAccountName' }

  const db = await mongo()
  const collection = db.collection(mongoDB.employeeCollection)
  try {
    const filteredDocs = await collection.find({ [query.prop]: query.value }).toArray()
    if (filteredDocs.length === 0) {
      return { status: 404, body: `No users found with "${query.prop}: "${query.value}"` }
    }
    return { status: 200, body: filteredDocs[0] }
  } catch (error) {
    return { status: 500, body: error.message }
  }
}
