const { bakeEmployees } = require('../lib/employee/bakeEmployees')
const { mongoDB } = require('../config')
const switchMainCollection = require('../lib/switchMainCollection')
const { logger } = require('@vtfk/logger')
const mongo = require('../lib/mongo')

module.exports = async function (context, req) {
  try {
    const employeeData = await bakeEmployees()

    const res = await switchMainCollection(mongoDB.employeeCollection, employeeData)
    /*
    const db = await mongo()
    const collection = db.collection(mongoDB.employeeCollection)
    const indexRes = await collection.createIndex( { fornavn: "text", etternavn: "text" } )
    */
    return { status: 200, body: res }
  } catch (error) {
    console.log(error)
    await logger('error', error.message)
    return { status: 500, body: error.message }
  }
}
