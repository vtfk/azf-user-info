const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyToken } = require('../lib/verifyToken')
const { logConfig, logger } = require('@vtfk/logger')

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
  'arbeidsforhold.ansettelsesprosent': 1,
  'arbeidsforhold.lonnsprosent': 1,
  'arbeidsforhold.hovedstilling': 1,
  'arbeidsforhold.stillingsnummer': 1,
  'arbeidsforhold.stillingstittel': 1,
  'arbeidsforhold.ansettelsesprosent': 1,
  'arbeidsforhold.personalressurskategori': 1,
  'arbeidsforhold.officeLocation': 1,
  'arbeidsforhold.mandatoryCompetenceInput': 1,
}

const allProjection = {
  _id: 0,
  organisasjonsId: 1,
  navn: 1,
  "leder.userPrincipalName": 1,
  "overordnet.organisasjonsId": 1,
  underordnet: 1,
  'arbeidsforhold.navn': 1,
  'arbeidsforhold.userPrincipalName': 1,
  'arbeidsforhold.stillingstittel': 1,
  'arbeidsforhold.personalressurskategori': 1,
  'arbeidsforhold.arbeidsforholdsperiode': 1
}

const taskProjection = {
  _id: 0,
  positionTasks: 1
}

const determineParam = (param) => {
  const emailRegex = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])")
  if (!isNaN(param) || param === 'hoved') { // orgid
    return { query:  { 'organisasjonsId': param }, searchProjection: orgProjection, type: 'unique' }
  } else if (emailRegex.test(param)) {
    return { query: { $or: [ { 'arbeidsforhold.userPrincipalName': param }, {'leder.userPrincipalName': param } ] }, searchProjection: orgProjection, type: 'unique' }
  } else if (param.toLowerCase() === 'all') {
    return { query: {}, searchProjection: allProjection, type: 'all' }
  } else {
    return { query: { navn: {'$regex' : param, '$options' : 'i'} }, searchProjection: orgProjection, type: 'search' }
  }
}

const isLeader = (upn, leaderUpn) => {
  if (upn === leaderUpn) return true
  else return false
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
  logger('info', ['checked if has privileged role - result', privileged])

  const { query, searchProjection, type } = determineParam(req.params.param)
  logger('info', [query, type])

  const db = mongo()
  let collection = db.collection(mongoDB.orgCollection)

  try {
    const org = await collection.find(query).project(searchProjection).toArray()
    if (type === 'all') return { status: 200, body: org }
    
    // If several returned - quick return result
    if (org.length > 1) { return { status: 200, body: org } }
    const positionIds = org.map(unit => {
      return unit.arbeidsforhold.map(forhold => forhold.systemId)
    })

    const taskQuery = { "positionTasks.positionId": { "$in": positionIds.flat() } }
    collection = db.collection(mongoDB.competenceCollection)
    const posTasks = await collection.find(taskQuery).project(taskProjection).toArray()
    let orgRes = org.map(unit => {
      return {
        ...unit,
        arbeidsforhold: unit.arbeidsforhold.map(forhold => {
          return {
            ...forhold,
            tasks: posTasks.find(posTask => posTask.positionTasks.find(pos => pos.positionId === forhold.systemId))?.positionTasks.find(task => task.positionId === forhold.systemId)?.tasks ?? [] 
          }
        })
      }
    })
    privileged = privileged || isLeader(ver.upn, orgRes[0].leder.userPrincipalName)

    if (!privileged) return { status: 200, body: orgRes }

    const competenceProjection = {
      _id: 0,
      "other.soloRole": 1,
      perfCounty: 1,
      userPrincipalName: 1
    }
    const competence =  await collection.find({}).project(competenceProjection).toArray()
    orgRes = orgRes.map(unit => {
      return {
        ...unit,
        arbeidsforhold: unit.arbeidsforhold.map(forhold => {
          const comp = competence.find(c => c.userPrincipalName === forhold.userPrincipalName)
          return {
            ...forhold,
            soloRole: comp?.other?.soloRole ?? null,
            perfCounty: comp?.perfCounty ?? null
          }
        }),
        isPrivileged: true
      }
    })
    return { status: 200, body: orgRes }
  } catch (error) {
    return { status: 500, body: error.message }
  }
}
