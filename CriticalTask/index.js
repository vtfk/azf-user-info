const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')
const { verifyToken } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')


module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - Critical Tasks',
    azure: {
      context,
      excludeInvocationId: true
    }
  })

  // Verify token
  const ver = verifyToken(req.headers.authorization)
  if (!ver.verified) return { status: 401, body: `You are not authorized to view this resource, ${ver.msg}` }
  
  // Verify payload
  if (typeof req.body !== 'object') return { status: 400, body: 'That is not an object body' }
  if (!Array.isArray(req.body)) return { status: 400, body: 'Object body must be of type array' }
  for (const task of req.body) {
    if (!task.hasOwnProperty('criticalTask') || !task.hasOwnProperty('ansattnummer')) return { status: 400, body: 'Array elements must be on the form: { ansattnummer: "1234567", criticalTask: true/false }' }
  }
  
  // Create list of employeeNumbers to update
  const employeeNumbers = req.body.map(criticalTask => criticalTask.ansattnummer)

  logger('info', ["Trying to update critical tasks"])
  try {
    // Get existing critical tasks
    const db = mongo()
    const collection = db.collection(mongoDB.criticalTasksCollection)
    const criticalQuery = { ansattnummer: { $in: employeeNumbers } }
    const criticalTasks = await collection.find(criticalQuery).project({ _id: 0 }).toArray()
    
    // Filter out unedited critical tasks
    const editedCriticalTasks = []
    for (const task of req.body) {
      const correspondingTask = criticalTasks.find(t => t.ansattnummer === task.ansattnummer)
      if (correspondingTask) {
        if (correspondingTask.criticalTask !== task.criticalTask) editedCriticalTasks.push(task)
      } else {
        editedCriticalTasks.push(task)
      }
    }

    // Create bulkwrite operation for mongo to handle
    const bulkOperation = editedCriticalTasks.map(task => {
      return {
        updateOne: {
          filter: { ansattnummer: task.ansattnummer },
          update: { $set: { ansattnummer: task.ansattnummer, criticalTask: task.criticalTask, modifiedBy: ver.upn, timestamp: new Date().toISOString() } },
          upsert: true
        }
      }
    })

    if (bulkOperation.length === 0) return { status: 200, body: 'Ingen endringer' }

    const upsertRes = await collection.bulkWrite(bulkOperation)
    return { status: 200, body: upsertRes }
  } catch (error) {
    return { status: 500, body: error.message }
  }
}