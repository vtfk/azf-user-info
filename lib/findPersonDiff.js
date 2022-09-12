const { deleteAfterInactiveDays } = require('../config')

const getDaysDiff = (oldDate, newDate) => {
  return Math.ceil((newDate.getTime() - oldDate.getTime()) / (1000 * 3600 * 24))
}

module.exports = (prevData, newData) => {
  prevData.forEach(oldPerson => {
    const matchIndex = newData.findIndex(newPerson => newPerson.fodselsnummer === oldPerson.fodselsnummer)
    if (matchIndex >= 0) {
      newData[matchIndex].fintStatus = {
        active: true,
        lastFetched: new Date().toISOString()
      }
    } else {
      const staleDays = getDaysDiff(new Date(oldPerson.fintStatus.lastFetched), new Date())
      if (staleDays < deleteAfterInactiveDays) { // if not found in fint, but not over delete threshold days
        delete oldPerson._id // delete mongoid
        oldPerson.fintStatus.active = false
        newData.push(oldPerson) // push to newData
      }
    }
  })
  return newData
}
