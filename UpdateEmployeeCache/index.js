const { bakeEmployees } = require('../lib/employee/bakeEmployees')
const { mongoDB } = require('../config')
const switchMainCollection = require('../lib/switchMainCollection')

module.exports = async function (context, req) {
  try {
    const employeeData = await bakeEmployees()

    const res = await switchMainCollection(mongoDB.employeeCollection, employeeData)

    return { status: 200, body: res }
  } catch (error) {
    console.log(error)
    return { status: 500, body: error.message }
  }
}
