const { logger } = require('@vtfk/logger')
const MongoClient = require('mongodb').MongoClient
const { mongoDB } = require('../config')

let client = null

module.exports = async () => {

  if (client && !client.isConnected) {
    client = null
    logger('info', ['mongo', 'discard client'])
  }

  if (client === null) {
    client = new MongoClient(mongoDB.connectionStringReadWrite, { useNewUrlParser: true, useUnifiedTopology: true })
    logger('info', ['mongo', 'new client init'])
  } else if (client.isConnected) {
    logger('info', ['mongo', 'client connected', 'quick return'])
    return client.db(mongoDB.database)
  }

  await client.connect()
  logger('info', ['mongo', 'client connected to server'])
  return client.db(mongoDB.database)
}