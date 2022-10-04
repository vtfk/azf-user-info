const { logger } = require('@vtfk/logger')
const MongoClient = require('mongodb').MongoClient
const { mongoDB } = require('../config')

let client = null

module.exports = async () => {
  if (client === null) {
    client = new MongoClient(mongoDB.connectionStringReadWrite)
    logger('info', ['mongo', 'new client init'])
  } else {
    logger('info', ['mongo', 'client already exists. Quick return'])
  }
  return client.db(mongoDB.database)
}
