const mongo = require('../lib/mongo')
const { mongoDB, appRoles, leaderLevel } = require('../config')
const { verifyToken } = require('../lib/verifyToken')
const { logConfig, logger } = require('@vtfk/logger')
const { getArbeidsforholdsType } = require('../lib/employee/employeeProjections')

const orgProjection = {
  _id: 0,
  organisasjonsId: 1,
  kortnavn: 1,
  navn: 1,
  etternavn: 1,
  organisasjonsnummer: 1,
  leder: 1,
  overordnet: 1,
  underordnet: 1,
  'arbeidsforhold.systemId': 1,
  'arbeidsforhold.navn': 1,
  'arbeidsforhold.userPrincipalName': 1,
  'arbeidsforhold.ansattnummer': 1,
  'arbeidsforhold.ansettelsesprosent': 1,
  'arbeidsforhold.lonnsprosent': 1,
  'arbeidsforhold.hovedstilling': 1,
  'arbeidsforhold.stillingsnummer': 1,
  'arbeidsforhold.stillingstittel': 1,
  'arbeidsforhold.arbeidsforholdstype': 1,
  'arbeidsforhold.personalressurskategori': 1,
  'arbeidsforhold.officeLocation': 1,
  'arbeidsforhold.arbeidssted.struktur': 1,
  'arbeidsforhold.mandatoryCompetenceInput': 1
}

const allProjection = {
  _id: 0,
  organisasjonsId: 1,
  navn: 1,
  kortnavn: 1,
  'leder.userPrincipalName': 1,
  'leder.navn': 1,
  'leder.ansattnummer': 1,
  'overordnet.organisasjonsId': 1,
  underordnet: 1,
  'arbeidsforhold.navn': 1,
  'arbeidsforhold.userPrincipalName': 1,
  'arbeidsforhold.stillingstittel': 1,
  'arbeidsforhold.personalressurskategori': 1,
  'arbeidsforhold.arbeidsforholdsperiode': 1,
  'arbeidsforhold.arbeidsforholdstype': 1,
  'arbeidsforhold.hovedstilling': 1,
  'arbeidsforhold.ansattnummer': 1
}

const allSmallProjection = {
  _id: 0,
  organisasjonsId: 1,
  navn: 1,
  'leder.ansattnummer': 1,
  'leder.navn': 1,
  underordnet: 1,
  'arbeidsforhold.navn': 1,
  'arbeidsforhold.ansattnummer': 1,
  'arbeidsforhold.stillingstittel': 1
}

const reportProjection = {
  _id: 0,
  organisasjonsId: 1,
  navn: 1,
  'leder.userPrincipalName': 1,
  underordnet: 1,
  'arbeidsforhold.ansattnummer': 1,
  'arbeidsforhold.arbeidssted.struktur': 1,
  'arbeidsforhold.userPrincipalName': 1,
  'arbeidsforhold.mandatoryCompetenceInput': 1,
  'arbeidsforhold.officeLocation': 1
}

const allAdminProjection = {
  _id: 0,
  organisasjonsId: 1,
  navn: 1,
  'leder.userPrincipalName': 1,
  'overordnet.organisasjonsId': 1,
  underordnet: 1,
  'arbeidsforhold.navn': 1,
  'arbeidsforhold.userPrincipalName': 1,
  'arbeidsforhold.mandatoryCompetenceInput': 1
}

const taskProjection = {
  _id: 0,
  positionTasks: 1
}

const determineParam = (param) => {
  const emailRegex = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])")
  if (!isNaN(param) || param === 'hoved') { // orgid
    return { query: { organisasjonsId: param }, searchProjection: orgProjection, type: 'unique' }
  } else if (emailRegex.test(param)) {
    return { query: { $or: [{ 'arbeidsforhold.userPrincipalName': param }, { 'leder.userPrincipalName': param }] }, searchProjection: orgProjection, type: 'unique' }
  } else if (param.toLowerCase() === 'all') {
    return { query: {}, searchProjection: allProjection, type: 'all' }
  } else if (param.toLowerCase() === 'alladmin') {
    return { query: {}, searchProjection: allAdminProjection, type: 'allAdmin' }
  } else if (param.toLowerCase() === 'allsmall') {
    return { query: {}, searchProjection: allSmallProjection, type: 'allSmall' }
  } else if (param.toLowerCase().substring(0, 6) === 'report') {
    return { query: {}, searchProjection: reportProjection, type: 'report', orgId: param.substring(7, param.length) }
  } else if (param.toLowerCase() === 'newcounties') {
    return { query: {}, searchProjection: allProjection, type: 'newCounties' }
  } else if (param.toLowerCase() === 'newcountiesall') {
    return { query: {}, searchProjection: allProjection, type: 'newCountiesAll' }
  } else {
    return { query: { navn: { $regex: param, $options: 'i' } }, searchProjection: orgProjection, type: 'search' }
  }
}

const isLeader = (upn, leaderUpn, forhold, level) => {
  if (upn === leaderUpn) return true
  if (forhold.length === 0) return false
  if (!forhold[0].arbeidssted?.struktur) return false
  const struct = forhold[0].arbeidssted.struktur.slice(0, level)
  if (struct.find(unit => unit.leder === upn)) return true
  return false
}

const repackArbeidsforhold = (orgs) => {
  const repacked = orgs.map(unit => {
    unit.struktur = null
    unit.arbeidsforhold = unit.arbeidsforhold.map(forhold => {
      if (forhold.arbeidssted?.struktur && !unit.struktur) unit.struktur = forhold.arbeidssted.struktur
      delete forhold.arbeidssted // remove struktur from forhold, don't need it
      forhold.arbeidsforholdstype = getArbeidsforholdsType(forhold.arbeidsforholdstype)
      return forhold
    })
    return unit
  })
  return repacked
}

// Get correct stillingsid / systemid - the last part sometimes changes
const getPositionId = (systemId) => {
  if (systemId.indexOf('--') === -1) return systemId
  if (systemId.split('--').length === 3) return systemId.substring(0, systemId.lastIndexOf('--'))
  return systemId
}

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - GetOrg',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  logger('info', ['new request - validating roles and upn'])
  // Verify token
  const ver = verifyToken(req.headers.authorization)
  if (!ver.verified) return { status: 401, body: `You are not authorized to view this resource, ${ver.msg}` }

  let privileged = ver.roles.includes(appRoles.admin) || ver.roles.includes(appRoles.privileged)
  logger('info', [ver.upn, 'checked if has privileged role - result', privileged])

  const { query, searchProjection, type, orgId } = determineParam(req.params.param)
  logger('info', [ver.upn, query, type])

  const isAdmin = ver.roles.includes(appRoles.admin)
  if (type === 'allAdmin' && !isAdmin) return { status: 401, body: 'You are not authorized to view this resource, you do not have admin role' }

  const db = mongo()
  let collection = db.collection(mongoDB.orgCollection)

  try {
    // First newCounties method
    if (type === 'newCounties') {
      // Get Acos reports with innplasseringsdata
      collection = db.collection(mongoDB.acosReportCollection)
      const innplasseringsdata = await collection.find( { type: 'innplasseringssamtale' } ).toArray()
      
      // Get new counties where caller is leader or temp leader
      const newCountyQuery = { $or: [{ "leder.userPrincipalName": ver.upn }, { "midlertidigLeder.userPrincipalName": ver.upn }] }
      collection = db.collection(mongoDB.vestfoldOrgCollection)
      const vestfold = await collection.find(newCountyQuery).toArray()

      collection =  db.collection(mongoDB.telemarkOrgCollection)
      const telemark = await collection.find(newCountyQuery).toArray()

      const mapCounty = (unit) => {
        unit.arbeidsforhold = unit.arbeidsforhold.filter(emp => emp.userPrincipalName !== ver.upn) // Remove leader - should innplassere itself
        unit.arbeidsforhold = unit.arbeidsforhold.map(emp => {
          const innplassering = innplasseringsdata.find(employee => employee.ansattnummer === emp.ansattnummer) // Find corresponding innplasseringsdata
          return {  
            ...emp,
            innplassering: innplassering ?? null
          }
        })
        return unit
      }

      // Finn innplasseringsdata for alle ansatte som lederen har tilgang på - slå sammen med ansattobjektene
      const leaderResult = {
        vestfold: vestfold.map(unit => mapCounty(unit)),
        telemark: telemark.map(unit => mapCounty(unit))
      }
      const innplassering = innplasseringsdata.find(emp => emp.employeeUpn === ver.upn) ?? null

      return { status: 200, body: { units: leaderResult, innplassering } }
    }

    if (type === 'newCountiesAll') {
      // Returner hele vestfold og hele telemark - om du er hr eller admin, returner også ansattforhold
      // Get Acos reports with innplasseringsdata
      collection = db.collection(mongoDB.acosReportCollection)
      const innplasseringsdata = await collection.find( { type: 'innplasseringssamtale' } ).toArray()
      
      // Get new counties where caller is leader or temp leader
      const newCountyQuery = {}
      collection = db.collection(mongoDB.vestfoldOrgCollection)
      const vestfold = await collection.find(newCountyQuery).toArray()

      collection =  db.collection(mongoDB.telemarkOrgCollection)
      const telemark = await collection.find(newCountyQuery).toArray()

      const mapCounty = (unit) => {
        unit.arbeidsforhold = unit.arbeidsforhold.map(emp => {
          const innplassering = innplasseringsdata.find(employee => employee.ansattnummer === emp.ansattnummer) // Find corresponding innplasseringsdata
          return {
            ...emp,
            innplassering: innplassering ?? null
          }
        })
        return unit
      }

      // Finn innplasseringsdata for alle ansatte som lederen har tilgang på - slå sammen med ansattobjektene
      const units = {
        vestfold: vestfold.map(unit => mapCounty(unit)),
        telemark: telemark.map(unit => mapCounty(unit))
      }
      return { status: 200, body: units }
    }

    let org = await collection.find(query).project(searchProjection).toArray()
    if (type === 'all' || type === 'allSmall') return { status: 200, body: org }

    // Admin orgs - get competence for all employees as well as employeedata
    if (type === 'allAdmin') {
      let allEmployees = []
      for (const unit of org) {
        allEmployees = [...allEmployees, ...unit.arbeidsforhold]
      }
      const competenceProjection = {
        _id: 0,
        'other.soloRole': 1,
        perfCounty: 1,
        positionTasks: 1,
        userPrincipalName: 1
      }
      collection = db.collection(mongoDB.competenceCollection)
      const competence = await collection.find({}).project(competenceProjection).toArray()
      org = org.map(unit => {
        const leader = allEmployees.find(l => l.userPrincipalName === unit.leder.userPrincipalName)
        const leaderCompetence = competence.find(c => c.userPrincipalName === unit.leder.userPrincipalName)
        const leaderWithCompetence = {
          ...leader,
          positionTasks: leaderCompetence?.positionTasks ?? [],
          soloRole: leaderCompetence?.other?.soloRole ?? null,
          perfCounty: leaderCompetence?.perfCounty ?? null
        }
        return {
          ...unit,
          leder: leaderWithCompetence,
          arbeidsforhold: unit.arbeidsforhold.map(forhold => {
            const comp = competence.find(c => c.userPrincipalName === forhold.userPrincipalName)
            return {
              ...forhold,
              positionTasks: comp?.positionTasks ?? [],
              soloRole: comp?.other?.soloRole ?? null,
              perfCounty: comp?.perfCounty ?? null
            }
          })
        }
      })
      return { status: 200, body: org }
    }

    // REPORT
    // Expand units and create report data, remove personal data from result
    if (type === 'report') {
      const paramUnit = org.find(unit => unit.organisasjonsId === orgId)
      // Check if orgId exists
      if (!paramUnit) return { status: 400, body: `${orgId} does not exist in db` }

      // Check if privileged or leader
      const leaderPrivilege = isLeader(ver.upn, paramUnit.leder.userPrincipalName, paramUnit.arbeidsforhold, leaderLevel)
      logger('info', [ver.upn, `checked if leader within level ${leaderLevel} for orgId: ${orgId} - result`, leaderPrivilege])
      privileged = privileged || leaderPrivilege

      if (!privileged) return { status: 401, body: 'You are not authorized to view this resource' }

      // Clear up stuff
      org = org.map(unit => {
        unit.arbeidsforhold = unit.arbeidsforhold.map(forhold => {
          delete forhold.arbeidssted
          return forhold
        })
        return unit
      })

      // Ok we create report
      // Get all underenheter
      let res = [paramUnit]
      const employees = [...(paramUnit.arbeidsforhold.map(emp => emp.userPrincipalName))]
      let childrenUnits = JSON.parse(JSON.stringify(paramUnit.underordnet))
      while (childrenUnits.length !== 0) {
        const currentChild = org.find(unit => unit.organisasjonsId === childrenUnits[0].organisasjonsId)
        if (currentChild) {
          currentChild.arbeidsforhold = currentChild.arbeidsforhold.filter(emp => !employees.includes(emp.userPrincipalName))
          employees.push(...(currentChild.arbeidsforhold.map(emp => emp.userPrincipalName)))
          res.push(currentChild)
          childrenUnits = [...childrenUnits, ...currentChild.underordnet]
        }
        childrenUnits = childrenUnits.slice(1, childrenUnits.length)
      }

      // Get report competence data
      const competenceProjection = {
        _id: 0,
        'other.soloRole': 1,
        perfCounty: 1,
        userPrincipalName: 1
      }
      collection = db.collection(mongoDB.competenceCollection)
      const competence = await collection.find({}).project(competenceProjection).toArray()

      // Repack result
      res = res.map(unit => {
        delete unit.leder
        delete unit.underordnet
        unit.arbeidsforhold = unit.arbeidsforhold.map(forhold => {
          const comp = competence.find(c => c.userPrincipalName === forhold.userPrincipalName)
          return {
            ansattnummer: forhold.ansattnummer,
            mandatoryCompetenceInput: forhold.mandatoryCompetenceInput,
            officeLocation: forhold.officeLocation,
            soloRole: comp?.other?.soloRole ?? null,
            perfCounty: comp?.perfCounty ?? null
          }
        })
        return unit
      })

      // Get critical tasks from collection
      // Get all employeeNumbers for report
      let employeeNumbers = []
      for (const unit of res) {
        const empNumbers = unit.arbeidsforhold.map(forhold => forhold.ansattnummer)
        employeeNumbers = employeeNumbers.concat(empNumbers)
      }

      // Get critical tasks for employeeNumbers
      const criticalQuery = { ansattnummer: { $in: employeeNumbers } }
      collection = db.collection(mongoDB.criticalTasksCollection)
      const criticalTasks = await collection.find(criticalQuery).project({ _id: 0 }).toArray()

      return { status: 200, body: { report: res, criticalTasks } }
    }

    // If several returned - quick return result
    if (org.length > 1) { return { status: 200, body: repackArbeidsforhold(org) } }

    // If none returned - quick return empty array
    if (org.length === 0) { return { status: 200, body: [] } }

    collection = db.collection(mongoDB.competenceCollection)
    const posTasks = await collection.find({}).project(taskProjection).toArray()
    let orgRes = org.map(unit => {
      return {
        ...unit,
        arbeidsforhold: unit.arbeidsforhold.map(forhold => {
          return {
            ...forhold,
            tasks: posTasks.find(posTask => posTask.positionTasks.find(pos => getPositionId(pos.positionId) === getPositionId(forhold.systemId)))?.positionTasks.find(task => getPositionId(task.positionId) === getPositionId(forhold.systemId))?.tasks ?? []
          }
        })
      }
    })

    // Check if privileged or leader
    const leaderPrivilege = isLeader(ver.upn, orgRes[0].leder.userPrincipalName, orgRes[0].arbeidsforhold, leaderLevel)
    logger('info', [ver.upn, `checked if leader within level ${leaderLevel} for ${orgRes[0].kortnavn} - result`, leaderPrivilege])
    privileged = privileged || leaderPrivilege

    if (!privileged) return { status: 200, body: repackArbeidsforhold(orgRes) }

    const competenceProjection = {
      _id: 0,
      'other.soloRole': 1,
      'other.soloRoleDescription': 1,
      perfCounty: 1,
      userPrincipalName: 1
    }
    const competence = await collection.find({}).project(competenceProjection).toArray()
    orgRes = orgRes.map(unit => {
      return {
        ...unit,
        arbeidsforhold: unit.arbeidsforhold.map(forhold => {
          const comp = competence.find(c => c.userPrincipalName === forhold.userPrincipalName)
          return {
            ...forhold,
            soloRole: comp?.other?.soloRole ?? null,
            soloRoleDescription: comp?.other?.soloRoleDescription ?? null,
            perfCounty: comp?.perfCounty ?? null
          }
        }),
        isPrivileged: true
      }
    })
    return { status: 200, body: repackArbeidsforhold(orgRes) }
  } catch (error) {
    return { status: 500, body: error.message }
  }
}
