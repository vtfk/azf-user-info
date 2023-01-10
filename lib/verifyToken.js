const jwt = require('jsonwebtoken')
const { logger } = require('@vtfk/logger')
const { validUpnSuffix } = require('../config')

const verifyTokenClaims = (token, claims) => {
  if (!token || typeof token !== 'string') return false
  const tokenData = jwt.decode(token.replace('Bearer ', ''))
  if (!tokenData) return false

  for (const claim of Object.keys(claims)) {
    if (!tokenData[claim]) return false
    if (Array.isArray(tokenData[claim])) {
      for (const claimValue of claims[claim]) {
        if (!tokenData[claim].includes(claimValue)) return false
      }
    } else if (claims[claim] !== tokenData[claim]) return false
  }

  return true
}

const verifyRoles = (token, roles) => {
  for (const role of roles) {
    if (verifyTokenClaims(token, { roles: [role] })) return true
  }
  return false
}

const verifyUpn = (token) => {
  if (!token) {
    logger('error', ['verifyToken', 'Unauthorized', 'missing token'])
    return false
  }
  const { upn } = jwt.decode(token.replace('Bearer ', ''))
  if (!upn) return false
  return upn.endsWith(validUpnSuffix)
}

const verifyToken = (token) => {
  if (!token) {
    return {
      verified: false,
      upn: 'No upn',
      roles: [],
      msg: 'No token'
    }
  }
  const { upn, roles } = jwt.decode(token.replace('Bearer ', ''))
  if (!upn) {
    return {
      verified: false,
      upn: 'No upn',
      roles: [],
      msg: 'Token not valid, does not contain upn'
    }
  }
  const verifiedUpn = upn.endsWith(validUpnSuffix)
  if (!verifiedUpn) {
    return {
      verified: false,
      upn,
      roles: [],
      msg: 'Not valid upn suffix'
    }
  }
  return {
    verified: true,
    upn,
    roles: roles && Array.isArray(roles) ? roles : [],
    msg: 'Has valid upn suffix'
  }
}

const verifyAppToken = (token) => {
  if (!token) {
    return {
      verified: false,
      appId: 'No id',
      roles: [],
      msg: 'No token'
    }
  }
  const { appid, roles } = jwt.decode(token.replace('Bearer ', ''))
  if (!appid) {
    return {
      verified: false,
      appid: 'No appid',
      roles: [],
      msg: 'Token not valid, does not contain appid'
    }
  }
  return {
    verified: true,
    appid,
    roles: roles && Array.isArray(roles) ? roles : [],
    msg: 'Has valid appid'
  }
}

const checkIfLeader = (token, structure, maxLevelAbove) => {
  const { upn } = jwt.decode(token.replace('Bearer ', ''))
  const leaders = structure.map(org => org.leder).slice(0, maxLevelAbove)
  return leaders.includes(upn)
}

const isLeader = (token, structures, maxLevelAbove = 1) => {
  for (const structure of structures) {
    if (checkIfLeader(token, structure, maxLevelAbove)) return true
  }
  return false
}

module.exports = { verifyTokenClaims, verifyRoles, verifyUpn, verifyToken, verifyAppToken, isLeader }
