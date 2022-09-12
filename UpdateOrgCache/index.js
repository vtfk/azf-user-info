const { mongoDB } = require('../config')
const bakeOrg = require('../lib/org/bakeOrg')
const switchMainCollection = require('../lib/switchMainCollection')

module.exports = async function (context, req) {
  try {
    const orgData = await bakeOrg()

    const res = await switchMainCollection(mongoDB.orgCollection, orgData)

    return { status: 200, body: res }
  } catch (error) {
    console.log(error)
    return { status: 500, body: error.message }
  }
}
