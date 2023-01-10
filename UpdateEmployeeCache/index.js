const { bakeEmployees } = require('../lib/employee/bakeEmployees')
const bakeOrg = require('../lib/org/bakeOrg')
const { mongoDB } = require('../config')
const switchMainCollection = require('../lib/switchMainCollection')
const { logger } = require('@vtfk/logger')
const mongo = require('../lib/mongo')

module.exports = async function (context, myTimer) {
  try {
    await logger('info', 'Starting updateEmployeeCache')
    const employeeData = await bakeEmployees()

    const res = await switchMainCollection(mongoDB.employeeCollection, employeeData)
    await logger('info', ['Finished updateEmployeeCache', res])

    await logger('info', 'Starting updateOrgCache')
    const orgData = await bakeOrg()

    const orgRes = await switchMainCollection(mongoDB.orgCollection, orgData)
    await logger('info', ['Finished updateOrgCache', orgRes])

    /*
    const db = mongo()
    const collection = db.collection(mongoDB.employeeCollection)
    const indexRes = await collection.createIndex( { fornavn: "text", etternavn: "text" } )
    */
  } catch (error) {
    await logger('error', error.message)
  }
}
