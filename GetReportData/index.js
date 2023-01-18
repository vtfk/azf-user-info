const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyRoles } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')

const getPositionId = (systemId) => {
  if (systemId.indexOf('--') === -1) return systemId
  if (systemId.split('--').length === 3) return systemId.substring(0, systemId.lastIndexOf('--'))
  return systemId
}

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - GetReportData',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  logger('info', ['new request - validating roles'])

  const db = mongo()
  const collection = db.collection(mongoDB.employeeCollection)

  const projection = {
    _id: 0,
    userPrincipalName: 1,
    navn: 1,
    'aktiveArbeidsforhold.systemId': 1,
    'aktiveArbeidsforhold.stillingstittel': 1
  }

  const employees = await (collection.find({}).project(projection).toArray())

  const duplicates = []
  const severalActive = []

  for (const emp of employees) {
    for (const forhold of emp.aktiveArbeidsforhold) {
      if (emp.aktiveArbeidsforhold.filter(f => getPositionId(f.systemId) === getPositionId(forhold.systemId)).length > 1) duplicates.push(emp)
      forhold.systemId = getPositionId(forhold.systemId)
    }
    if (emp.aktiveArbeidsforhold.length > 1) severalActive.push(emp)
  }

  return { status: 200, body: { dupli: duplicates.length, all: employees.length, bup: severalActive } }
  /*
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
  } */
}
