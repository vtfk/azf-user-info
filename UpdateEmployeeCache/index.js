const bakeEmployees = require('../lib/bakeEmployees')
const mongo = require('../lib/mongo')

module.exports = async function (context, req) {
    try {
    const employeeData = await bakeEmployees()
    const db = await mongo()
    const collection = db.collection('employees')
    const insertResult = await collection.insertMany(employeeData.slice(3000,3010))
    return { status: 200, body: insertResult }
  } catch (error) {
    console.log(error)
    return { status: 500, body: error.message }
  }
}
