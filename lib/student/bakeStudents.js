const { getStudentPersons } = require('./fintStudent')
const { getOfficeLocations } = require('../graphRequests')
const { unknownValue, mongoDB, deleteAfterInactiveDays } = require('../../config')
const { logger } = require('@vtfk/logger')
const mongo = require('../mongo')
const findPersonDiff = require('../findPersonDiff')

module.exports = async () => {
  // Data from FINT
  const studentPersons = await getStudentPersons()
  return studentPersons
}
