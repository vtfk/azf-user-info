// const bakeOrg = require('../lib/org/bakeOrg')
const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')

module.exports = async function (context, req) {
    try {
    // const employeeData = await bakeEmployees()
    
    /*
    const db = await mongo()
    const collection = db.collection(mongoDB.employeeCollection)
    await collection.drop()
    const insertResult = await collection.insertMany(employeeData)
    return { status: 200, body: insertResult }
    */
  } catch (error) {
    console.log(error)
    return { status: 500, body: error.message }
  }
}