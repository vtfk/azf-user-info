const bakeStudents = require('../lib/student/bakeStudents')
const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')

module.exports = async function (context, req) {
    try {
    const studentData = await bakeStudents()
    const db = await mongo()
    const collection = db.collection(mongoDB.studentCollection)
    await collection.drop()
    const insertResult = await collection.insertMany(studentData)
    return { status: 200, body: insertResult }
  } catch (error) {
    console.log(error)
    return { status: 500, body: error.message }
  }
}