const mongo = require('../lib/mongo')
const { mongoDB, appRoles, leaderLevel } = require('../config')
const { verifyAppToken } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')
const lookupKrr = require('../lib/lookupKrr')
const repackCompetence = require('../lib/repackCompetence')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - GetEmployeeData',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  logger('info', ['new request - validating roles and appid'])
  // Verify token
  const ver = verifyAppToken(req.headers.authorization)
  if (!ver.verified) {
    return {
      status: 401,
      body: `You are not authorized to view this resource, ${ver.msg}`
    }
  }

  const hasAccess = ver.roles.includes(appRoles.applicationRead)
  logger('info', [ver.appid, 'checked if has privileged role - result', hasAccess])
  if (!hasAccess) {
    return {
      status: 401,
      body: 'You are not authorized to view this resource, required role missing'
    }
  }

  if (!req.body) return { status: 400, body: 'body is required' }
  const upnString = req.body

  if (!upnString) {
    return { status: 400, body: 'Missing required parameter "upnString"' }
  }

  const upns = upnString.split(';')
  if (upns.length !== 2) {
    return {
      status: 400,
      body: 'upnString needs to be on the format "manager@company.com;employee@company.com'
    }
  }
  // Da sjekker vi om manager er sjef for employee - hvis den er det - så returnerer vi kompetanse-data, hvis ikke, så sier vi at den må legge det inn selv, eller være sjef

  const managerUpn = upns[0]
  const employeeUpn = upns[1]

  const db = mongo()
  let collection = db.collection(mongoDB.employeeCollection)
  let query = { userPrincipalName: employeeUpn, harAktivtArbeidsforhold: true }
  const employee = await collection.findOne(query)
  if (!employee) {
    logger('info', [ver.appid, `Could not find employee for ${employeeUpn}`])
    return {
      status: 200,
      body: repackCompetence({ msg: `Fant ingen ansatt med brukernavn: ${employeeUpn}` }, null, null, false)
    }
  }

  logger('info', [ver.appid, `Looking up ${employeeUpn} in KRR`])
  const krr = await lookupKrr(employee.fodselsnummer)

  logger('info', [ver.appid, `Found employeeData for ${employeeUpn}, checking if ${managerUpn} is manager`
  ])

  // Vi går gjennom strukrurer for aktive arbeidsforhold - sjekker om managerUpn ligger i maks nivå "variabel" som leder for den ansatte
  let isLeader = false
  for (const forhold of employee.aktiveArbeidsforhold) {
    const leaders = forhold.arbeidssted.struktur
      .slice(0, leaderLevel)
      .map(unit => unit.leder)
    if (leaders.includes(managerUpn)) isLeader = true
  }
  if (!isLeader) {
    logger('info', [ver.appid, `${managerUpn} is NOT manager for ${employeeUpn}, will not return employeeData`])
    return {
      status: 200,
      body: repackCompetence({ navn: employee.navn, msg: `Du er ikke registrert som leder for ${employee.navn}, og får derfor ikke hente data fra kompetansemodulen`, fodselsnummer: null }, null, krr, false)
    }
  }

  // ManagerUpn er leder for employeeUpn innen nivå leaderLevel, da henter vi kompetansedata og sender tilbake
  collection = db.collection(mongoDB.competenceCollection)
  query = { fodselsnummer: employee.fodselsnummer }
  const competence = await collection.findOne(query)

  if (!competence) {
    logger('info', [ver.appid, `Could not find competencedata for ${employeeUpn}`])
    return {
      status: 200,
      body: repackCompetence({ ...employee, msg: `Fant ansatt ${employee.navn}, men ansatt har ikke fylt ut kompetanse på https://kompetanse.vtfk.no` }, null, krr, true)
    }
  }

  logger('info', [ver.appid, `${managerUpn} is manager for ${employeeUpn}, will return employeeData`])

  const result = repackCompetence(employee, competence, krr, true)

  return { status: 200, body: result }
}
