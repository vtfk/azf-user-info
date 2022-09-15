const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')

module.exports = async function (context, req) {

  const db = await mongo()
  const collection = db.collection(mongoDB.orgCollection)
  try {
    const org = await collection.find({}).toArray()
    // const repacked = repack(persons)
    return { status: 200, body: org }
  } catch (error) {
    return { status: 500, body: error.message }
  }
}