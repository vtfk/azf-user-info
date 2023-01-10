const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')
const { verifyToken } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')

const taskProjection = {
  _id: 0,
  'positionTasks.positionParent': 1,
  'positionTasks.tasks': 1
}

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - GetTasks',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  // Verify that the users have access to this endpoint
  if (!req.headers.authorization) return { status: 401, body: 'You are not authorized to access this resource' }

  const ver = verifyToken(req.headers.authorization)
  if (!ver.verified) return { status: 401, body: `You are not authorized to view this resource, ${ver.msg}` }

  const param = req.params.unit.replace(/[^a-zA-Z0-9æøåÆØÅ\- ]/gi, '')
  logger('info', [ver.upn, `Sanitized param, searching for "${param}"`])

  /*
  Gå gjennom mongo - competence data, alle stillinger sine tasks, unike.
  Returner dem i fin listeform, value category
  */

  const db = mongo()
  const collection = db.collection(mongoDB.competenceCollection)
  try {
    const positionTasks = await (collection.find({ 'positionTasks.positionParent': param }).project(taskProjection).toArray())
    const res = []
    for (const ele of positionTasks) {
      for (const positionTask of ele.positionTasks.filter(t => t.positionParent === param)) {
        for (const task of positionTask.tasks) {
          if (!res.find(ele => ele.value === task)) {
            res.push(
              {
                value: task,
                category: positionTask.positionParent
              }
            )
          }
        }
      }
    }
    return { status: 200, body: res }
  } catch (error) {
    return { status: 500, body: error.message }
  }
}
