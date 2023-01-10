const mongo = require('../lib/mongo')
const { mongoDB, appRoles, leaderLevel } = require('../config')
const { verifyToken, isLeader } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')
const { employeeProjection, nameSearchProjection, filterEmployeeData, repackArbeidsforhold } = require('../lib/employee/employeeProjections')

const determineParam = (id) => {
  const emailRegex = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])")
  const samAccountRegex = new RegExp('[a-z]{2,3}[0-9]{4,5}')
  if (id.length === 11 && !isNaN(id)) { // SSN
    return { query: { fodselsnummer: id, harAktivtArbeidsforhold: true }, searchProjection: employeeProjection, type: 'unique' }
  } else if (id.length < 10 && !isNaN(id)) {
    return { query: { ansattnummer: id, harAktivtArbeidsforhold: true }, searchProjection: employeeProjection, type: 'unique' }
  } else if (emailRegex.test(id)) {
    return { query: { userPrincipalName: id, harAktivtArbeidsforhold: true }, searchProjection: employeeProjection, type: 'unique' }
  } else if (samAccountRegex.test(id)) {
    return { query: { samAccountName: id, harAktivtArbeidsforhold: true }, searchProjection: employeeProjection, type: 'unique' }
  } else {
    return { query: { navn: { $regex: id, $options: 'i' }, harAktivtArbeidsforhold: true }, searchProjection: nameSearchProjection, type: 'search' }
  }
}

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - GetEmployee',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  logger('info', ['new request - validating roles and upn'])
  // Verify token
  const ver = verifyToken(req.headers.authorization)
  if (!ver.verified) return { status: 401, body: `You are not authorized to view this resource, ${ver.msg}` }

  const privileged = ver.roles.includes(appRoles.admin) || ver.roles.includes(appRoles.privileged)
  logger('info', [ver.upn, 'checked if has privileged role - result', privileged])

  if (!req.params.id) return { status: 400, body: 'Please specify query param {id} with an ssn, upn, samAccountName, ansattnummer, or name' }
  const { query, searchProjection, type } = determineParam(req.params.id)
  if (!query) return { status: 400, body: 'Please specify VALID query param {id} with an ssn, upn, samAccountName, ansattnummer, or name' }

  // Check if can use ssn as query
  if (!privileged && query.fodselsnummer) return { status: 401, body: 'You are not authorized to use ssn as query' }

  logger('info', [ver.upn, 'running query for', query])
  const db = mongo()
  let collection = db.collection(mongoDB.employeeCollection)
  let res = {}
  try {
    const employeeData = await collection.find(query).limit(10).project(searchProjection).toArray()
    if (employeeData.length === 0) {
      logger('info', [ver.upn, 'No users found with', query])
      return { status: 404, body: `No users found with "${JSON.stringify(query)}"` }
    }
    logger('info', [ver.upn, 'Found employee data for user', query])
    res = employeeData
  } catch (error) {
    logger('error', [ver.upn, error.message])
    return { status: 500, body: error.message }
  }

  if (type === 'search') {
    logger('info', [ver.upn, 'Using searchProjection', query, 'do not need competence data'])
    return { status: 200, body: res }
  } else if (!privileged) {
    // Check if has leader privilege
    const structures = res[0].aktiveArbeidsforhold.map(forhold => {
      return forhold.arbeidssted.struktur
    })

    const leaderPrivilege = isLeader(req.headers.authorization, structures, leaderLevel)

    if (leaderPrivilege) {
      logger('info', [`${ver.upn} is leader for ${res[0].userPrincipalName} - level ${leaderLevel}`, 'Will expand result with competence data'])
    } else {
      logger('info', [ver.upn, 'Not privileged', query, 'do not need competence data'])
      // Repack arbeidsforholdstyper
      res = repackArbeidsforhold(res)
      res = filterEmployeeData(res[0])
      return { status: 200, body: [res] }
    }
  }

  // If privileged and specific query we expand with competence data
  try {
    // Repack arbeidsforholdstyper
    res = repackArbeidsforhold(res)
    res = { ...res[0] }
    collection = db.collection(mongoDB.competenceCollection)
    const competenceData = await collection.find({ fodselsnummer: res.fodselsnummer }).project({ _id: 0 }).toArray()
    if (competenceData.length === 0) {
      res.competenceData = {}
    } else {
      logger('info', [ver.upn, 'Found competence data for user', query])
      res.competenceData = competenceData[0]
      delete res.competenceData.fodselsnummer
    }
    delete res.fodselsnummer
  } catch (error) {
    logger('error', [ver.upn, error.message])
    return { status: 500, body: error.message }
  }
  return { status: 200, body: [{ ...res, isPrivileged: true }] }
}
