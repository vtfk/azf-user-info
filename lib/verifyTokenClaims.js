const jwt = require('jsonwebtoken')

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

module.exports = { verifyTokenClaims, verifyRoles }
