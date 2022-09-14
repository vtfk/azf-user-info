const { verifyTokenClaims, verifyRoles } = require('../../lib/verifyTokenClaims')
const jwt = require('jsonwebtoken')

const token1Data = {
  roles: ['rolle1', 'rolle2'],
  enClaim: 'kleimert'
}

const token2Data = {
  roles: ['rolle1'],
  enClaim: 'kleimert'
}

const token3Data = {
  enClaim: 'kleimert'
}

const token4Data = {
  roles: ['rolle3']
}

const token1 = jwt.sign(token1Data, 'hva som helstssss')
const token2 = jwt.sign(token2Data, 'hva som helstssss')
const token3 = jwt.sign(token3Data, 'hva som helstssss')
const token4 = jwt.sign(token4Data, 'hva som helstssss')

describe('Check that verifyTokenClaims ', () => {
  test('Returns true, when all required claims are present', () => {
    const verified = verifyTokenClaims(token1, token1Data)
    expect(verified).toBe(true)
  })
  test('Returns false, when not all required claims are present', () => {
    const verified = verifyTokenClaims(token2, token1Data)
    expect(verified).toBe(false)
    const verified2 = verifyTokenClaims(token3, { hei: 'hade', rolller: ['tut tut', 'burt', 'shmiiid'] })
    expect(verified2).toBe(false)
  })
})

describe('Check that verifyRoles ', () => {
  test('Returns true, when at least one role is present', () => {
    const verifiedRole = verifyRoles(token2, token1Data.roles)
    expect(verifiedRole).toBe(true)
  })
  test('Returns false, when no role is present', () => {
    const verifiedRole = verifyRoles(token3, token1Data.roles)
    expect(verifiedRole).toBe(false)
  })
  test('Returns false, when no matching role is present', () => {
    const verifiedRole = verifyRoles(token4, token1Data.roles)
    expect(verifiedRole).toBe(false)
  })
})
