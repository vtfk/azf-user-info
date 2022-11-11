const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')
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
  'arbeidsforhold.officeLocation': 1
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
  'arbeidsforhold.personalressurskategori': 1
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
    return { query: { 'arbeidsforhold.userPrincipalName': param }, searchProjection: orgProjection, type: 'unique' }
  } else if (param.toLowerCase() === 'all') {
  return { query: {}, searchProjection: allProjection, type: 'all' }
  } else if (param.toLowerCase() === 'allstructured') {
    return { query: {}, searchProjection: allProjection, type: 'allStructured' }
  } else {
    return { query: { navn: {'$regex' : param, '$options' : 'i'} }, searchProjection: orgProjection, type: 'search' }
  }
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

  const { query, searchProjection, type } = determineParam(req.params.param)
  logger('info', [query, type])

  const db = mongo()
  let collection = db.collection(mongoDB.orgCollection)

  try {
    if (type === 'allStructured') collection = db.collection(mongoDB.orgStructuredCollection)

    const org = await collection.find(query).project(searchProjection).toArray()
    if (type === 'all' || type === 'allStructured') return { status: 200, body: org }

    const positionIds = org.map(unit => {
      return unit.arbeidsforhold.map(forhold => forhold.systemId)
    })


    const taskQuery = { "positionTasks.positionId": { "$in": positionIds.flat() } }
    collection = db.collection(mongoDB.competenceCollection)
    const posTasks = await collection.find(taskQuery).project(taskProjection).toArray()
    const orgRes = org.map(unit => {
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

    return { status: 200, body: orgRes }
  } catch (error) {
    return { status: 500, body: error.message }
  }
}
