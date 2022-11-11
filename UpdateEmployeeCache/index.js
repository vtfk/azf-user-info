const { bakeEmployees } = require('../lib/employee/bakeEmployees')
const bakeOrg = require('../lib/org/bakeOrg')
const { mongoDB } = require('../config')
const switchMainCollection = require('../lib/switchMainCollection')
const { logger } = require('@vtfk/logger')
const mongo = require('../lib/mongo')

// TODO: Rydd opp denna...
const structurize = (units) => {
  const hoved = units.find(unit => unit.organisasjonsId === 'hoved')
  hoved.underordnet = hoved.underordnet.map(underUnit1 => {
    let expandedUnit1 = units.find(u => u.organisasjonsId === underUnit1.organisasjonsId)
    if (!expandedUnit1) expandedUnit1 = null
    else expandedUnit1.underordnet = expandedUnit1.underordnet.map(underUnit2 => {
      let expandedUnit2 = units.find(u => u.organisasjonsId === underUnit2.organisasjonsId)
      if (!expandedUnit2) expandedUnit2 = null
      else expandedUnit2.underordnet = expandedUnit2.underordnet.map(underUnit3 => {
        let expandedUnit3 = units.find(u => u.organisasjonsId === underUnit3.organisasjonsId)
        if (!expandedUnit3) expandedUnit3 = null
        else expandedUnit3.underordnet = expandedUnit3.underordnet.map(underUnit4 => {
          let expandedUnit4 = units.find(u => u.organisasjonsId === underUnit4.organisasjonsId)
          if (!expandedUnit4) expandedUnit4 = null
          else expandedUnit4.underordnet = expandedUnit4.underordnet.map(underUnit5 => {
            let expandedUnit5 = units.find(u => u.organisasjonsId === underUnit5.organisasjonsId)
            if (!expandedUnit5) expandedUnit5 = null
            else expandedUnit5.underordnet = expandedUnit5.underordnet.map(underUnit6 => {
              let expandedUnit6 = units.find(u => u.organisasjonsId === underUnit6.organisasjonsId)
              if (!expandedUnit6) expandedUnit6 = null
              else if (!expandedUnit6) logger('info', expandedUnit6)
              return expandedUnit6
            }).filter(u => u !== null)
            return expandedUnit5
          }).filter(u => u !== null)
          return expandedUnit4
        }).filter(u => u !== null)
        return expandedUnit3
      }).filter(u => u !== null)
      return expandedUnit2
    }).filter(u => u !== null)
    return expandedUnit1
  })
  return [hoved]
}

module.exports = async function (context, myTimer) {
  try {
    await logger('info', 'Starting updateEmployeeCache')
    const employeeData = await bakeEmployees()

    const res = await switchMainCollection(mongoDB.employeeCollection, employeeData)
    await logger('info', ['Finished updateEmployeeCache', res])

    await logger('info', 'Starting updateOrgCache')
    const orgData = await bakeOrg()

    const orgRes = await switchMainCollection(mongoDB.orgCollection, orgData)
    await logger('info', ['Finished updateOrgCache', orgRes])

    await logger('info', 'Starting updateOrgStructuredCache')
    const orgStructured = structurize(orgData)

    const orgStructuredRes = await switchMainCollection(mongoDB.orgStructuredCollection, orgStructured)
    await logger('info', ['Finished updateOrgStructuredCache', orgStructuredRes])
    
    /*
    const db = mongo()
    const collection = db.collection(mongoDB.employeeCollection)
    const indexRes = await collection.createIndex( { fornavn: "text", etternavn: "text" } )
    */
  } catch (error) {
    await logger('error', error.message)
  }
}
