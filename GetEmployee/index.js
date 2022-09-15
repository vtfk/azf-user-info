const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyRoles } = require('../lib/verifyTokenClaims')
const { logger, logConfig } = require('@vtfk/logger')


const determineParam = (id) => {
  const emailRegex = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])")
  if (id.length === 11 && !isNaN(id)) { // SSN
    return { prop: 'fodselsnummer', value: id }
  } else if (emailRegex.test(id)) {
    return { prop: 'userPrincipalName', value: id }
  } else if (typeof id === 'string' && id.length < 50) {
    return { prop: 'samAccountName', value: id }
  } else {
    return undefined
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
  logger('info', [`new request - validating roles`])
  
  // Base projection
  let projection = {
    userPrincipalName: 1,
    fornavn: 1,
    etternavn: 1,
    officeLocation: 1,
    'aktiveArbeidsforhold.hovedstilling': 1,
    'aktiveArbeidsforhold.stillingstittel': 1,
    'aktiveArbeidsforhold.arbeidssted.navn': 1,
    'azureAd.manager.displayName': 1,
    'azureAd.manager.userPrincipalName': 1,
  } 
  // Verify that the users have access to this endpoint
  if (verifyRoles(req.headers.authorization, [appRoles.admin, appRoles.priveleged])) {
    projection = {
      ...projection,
      samAccountName: 1,
      mobilePhone: 1,
      privatEpostadresse: 1,
      bostedsadresse: 1,
      kjonn: 1,
      ansattnummer: 1,
      kontaktEpostadresse: 1,
      arbeidsforhold: 1,
      personalressurskategori: 1,
      harAktivtArbeidsforhold: 1
    }
    logger('info', [`roles validated - will use expanded projection data`, projection])
  } else {
    logger('info', [`roles not present - will use base projection data`, projection])
  }

  if (!req.params.id) return { status: 400, body: 'Please specify query param {id} with an ssn, upn, or samAccountName' }
  const query = determineParam(req.params.id)
  if (!query) return { status: 400, body: 'Please specify VALID query param {id} with an ssn, upn, or samAccountName' }
  
  logger('info', [`running query for ${query.prop}: "${query.value}"`])
  const db = await mongo()
  const collection = db.collection(mongoDB.employeeCollection)
  try {
    const filteredDocs = await collection.find({ [query.prop]: query.value }).project(projection).toArray()
    if (filteredDocs.length === 0) {
      logger('info', [`No users found with "${query.prop}: "${query.value}"`])
      return { status: 404, body: `No users found with ${query.prop}: "${query.value}"` }
    }
    logger('info', [`Found data for user ${query.prop}: "${query.value}"`])
    return { status: 200, body: filteredDocs[0] }
  } catch (error) {
    logger('error', error.message)
    return { status: 500, body: error.message }
  }
}
