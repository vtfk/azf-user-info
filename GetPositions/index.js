const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')
const { verifyUpn } = require('../lib/verifyToken')
const repackPositionsList = require('../lib/employee/repackPositionsList')
const { logger, logConfig } = require('@vtfk/logger')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - GetPositions',
    azure: {
      context,
      excludeInvocationId: true
    }
  })

  // Verify that the users have access to this endpoint
  const verUpn = verifyUpn(req.headers.authorization)
  if (!verUpn) {
    logger('error', ['user does not have access to this endpoint'])
    return { status: 401, body: 'You are not authorized to view this resource, upn suffix is not authorized' }
  }

  logger('info', ['generating data list'])

  const query = {
    $or: [
      {
        'aktiveArbeidsforhold.1': { '$exists': true }
      },
      {
        'tidligereArbeidsforhold.1': { '$exists': true }
      }
    ]
  }
  const projection = {
    'aktiveArbeidsforhold.stillingstittel': 1,
    'tidligereArbeidsforhold.stillingstittel': 1
  }

  const db = mongo()
  const collection = db.collection(mongoDB.employeeCollection)
  try {
    const employees = await collection.find(query).project(projection).toArray()
    logger('info', ['found', employees.length, 'employees'])
    const repacked = repackPositionsList(employees)
    logger('info', ['found', repacked.length, 'positions'])
    return { status: 200, body: repacked }
  } catch (error) {
    return { status: 500, body: error.message }
  }
}
