const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyAppToken } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - GetOrgData',
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

  // Sjekk param om den er vestfold eller telemark
  const allowedParams = ['nyeVestfoldNames', 'nyeTelemarkNames']
  const param = req.params.param
  if (!allowedParams.includes(param)) return { status: 400, body: `Endpoint requires parameter ${allowedParams.join(' or ')}` }

  // Hent navn på nye enheter og send tilbake på hensiktsmessig format
  const db = mongo()
  let collection
  if (param === 'nyeVestfoldNames') collection = db.collection(mongoDB.vestfoldOrgCollection)
  if (param === 'nyeTelemarkNames') collection = db.collection(mongoDB.telemarkOrgCollection)

  const units = await collection.find({}).toArray()

  const names = units.map(unit => {
    let overordnet = unit.overordnet ?? { navn: "" }
    overordnet = overordnet.navn.length > 1 ? ` - ${overordnet.navn}` : overordnet.navn
    return `${unit.navn}${overordnet}`
  })

  return { status: 200, body: names }

}
