const { verifyToken, isLeader } = require('../../lib/verifyToken')
const { validUpnSuffix } = require('../../config')
const jwt = require('jsonwebtoken')


// Verfiy token
const validTokenWithRolesData = {
  upn: `enellerannen${validUpnSuffix}`,
  roles: ['superadmin']
}

const validTokenWithoutRolesData = {
  upn: `enellerannen${validUpnSuffix}`
}

const invalidUpnSuffixData = {
  upn: 'halla@balla.no'
}

const noUpnData = {
  randomStuff: 'Hhihaklk'
}


const validTokenWithRoles = jwt.sign(validTokenWithRolesData, 'hva som helstssss')
const validTokenWithoutRoles = jwt.sign(validTokenWithoutRolesData, 'hva som helstssss')
const invalidUpnSuffix = jwt.sign(invalidUpnSuffixData, 'hva som helstssss')
const noUpn = jwt.sign(noUpnData, 'hva som helstssss')

describe('Check that verifyToken returns as expected, when ', () => {
  test('valid upn suffix and roles are present', () => {
    const ver = verifyToken(validTokenWithRoles)
    expect(ver.verified).toBe(true)
    expect(JSON.stringify(ver.roles)).toBe(JSON.stringify(validTokenWithRolesData.roles))
  })
  test('valid upn suffix is present, no roles are present', () => {
    const ver = verifyToken(validTokenWithoutRoles)
    expect(ver.verified).toBe(true)
    expect(ver.roles.length).toBe(0)
  })
  test('invalid upn suffix is present', () => {
    const ver = verifyToken(invalidUpnSuffix)
    expect(ver.verified).toBe(false)
    expect(ver.roles.length).toBe(0)
  })
  test('no upn is present', () => {
    const ver = verifyToken(noUpn)
    expect(ver.verified).toBe(false)
    expect(ver.roles.length).toBe(0)
  })
  test('no token is present', () => {
    const ver = verifyToken()
    expect(ver.verified).toBe(false)
    expect(ver.roles.length).toBe(0)
  })
})

// isLeader
const structures = [ [ { leder: 'sjef1@jobb.no' }, { leder: 'sjef2@jobb.no' }, { leder: 'sjef3@jobb.no' }, { leder: 'sjef4@jobb.no' }, { leder: 'sjef5@jobb.no' } ], [ { leder: 'enannensjef@jobb.no' } ] ]

const isLeaderLevel1 = {
  upn: 'sjef1@jobb.no'
}

const isLeaderLevel2 = {
  upn: 'sjef2@jobb.no'
}

const isLeaderLevel3 = {
  upn: 'sjef3@jobb.no'
}

const isLeaderLevel4 = {
  upn: 'sjef4@jobb.no'
}

const isLeaderLevel5 = {
  upn: 'sjef5@jobb.no'
}

const isLeaderSomewhereElse = {
  upn: 'sjefHuttiheita@jobb.no'
}

const leader1 = jwt.sign(isLeaderLevel1, 'hva som helstssss')
const leader2 = jwt.sign(isLeaderLevel2, 'hva som helstssss')
const leader3 = jwt.sign(isLeaderLevel3, 'hva som helstssss')
const leader4 = jwt.sign(isLeaderLevel4, 'hva som helstssss')
const leader5 = jwt.sign(isLeaderLevel5, 'hva som helstssss')
const leaderNotInStructure = jwt.sign(isLeaderSomewhereElse, 'hva som helstssss')

describe('Check that isLeader with maxLevelAbove=1 returns', () => {
  test('true when leader is at level 1', () => {
    const isLeader1 = isLeader(leader1, structures, 1)
    expect(isLeader1).toBe(true)
  })
  test('false when leader is not at level 1', () => {
    const isLeader2 = isLeader(leader2, structures, 1)
    expect(isLeader2).toBe(false)
    const isLeader3 = isLeader(leader3, structures, 1)
    expect(isLeader3).toBe(false)
    const isLeader4 = isLeader(leader4, structures, 1)
    expect(isLeader4).toBe(false)
    const isLeader5 = isLeader(leader5, structures, 1)
    expect(isLeader5).toBe(false)
  })
})
describe('Check that isLeader with maxLevelAbove=3 returns', () => {
  test('true when leader is at level 1-3', () => {
    const isLeader1 = isLeader(leader1, structures, 3)
    expect(isLeader1).toBe(true)
    const isLeader2 = isLeader(leader2, structures, 3)
    expect(isLeader2).toBe(true)
    const isLeader3 = isLeader(leader3, structures, 3)
    expect(isLeader3).toBe(true)
  })
  test('false when leader is not at level 1-3', () => {
    const isLeader4 = isLeader(leader4, structures, 3)
    expect(isLeader4).toBe(false)
    const isLeader5 = isLeader(leader5, structures, 3)
    expect(isLeader5).toBe(false)
  })
})
describe('Check that isLeader with maxLevelAbove=5 returns', () => {
  test('true when leader is at level 1-5', () => {
    const isLeader1 = isLeader(leader1, structures, 5)
    expect(isLeader1).toBe(true)
    const isLeader2 = isLeader(leader2, structures, 5)
    expect(isLeader2).toBe(true)
    const isLeader3 = isLeader(leader3, structures, 5)
    expect(isLeader3).toBe(true)
    const isLeader4 = isLeader(leader4, structures, 5)
    expect(isLeader4).toBe(true)
    const isLeader5 = isLeader(leader5, structures, 5)
    expect(isLeader5).toBe(true)
  })
  test('false when leader is not part of structure', () => {
    const isLeaderNOOOT = isLeader(leaderNotInStructure, structures, 5)
    expect(isLeaderNOOOT).toBe(false)
  })
})
