const { bakeEmployees } = require('../lib/employee/bakeEmployees')
const { mongoDB } = require('../config')
const switchMainCollection = require('../lib/switchMainCollection')
const { logger } = require('@vtfk/logger')

module.exports = async function (context, req) {
  try {
    const employeeData = await bakeEmployees()

    const res = await switchMainCollection(mongoDB.employeeCollection, employeeData)

    return { status: 200, body: res }
  } catch (error) {
    console.log(error)
    await logger('error', error.message)
    return { status: 500, body: error.message }
  }
}
