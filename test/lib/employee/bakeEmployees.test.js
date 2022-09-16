const { bakeEmployeeData } = require('../../../lib/employee/bakeEmployees')
const { resourceCategoryCodes } = require('./testData/resourceCategoryCodes.json')
const { azureAdPersons } = require('./testData/azureAdPersons.json')
const { employeePersons } = require('./testData/employeePersons.json')
const { employeePositionCodes } = require('./testData/employeePositionCodes.json')
const { employeePositions } = require('./testData/employeePositions.json')
const { organizationElements } = require('./testData/organizationElements.json')
const { employeeResources } = require('./testData/employeeResources.json')

const empData = bakeEmployeeData(resourceCategoryCodes, employeePositionCodes, employeePersons, employeeResources, employeePositions, organizationElements, azureAdPersons)

describe('bakeEmployeeData runs nice-nice', () => {
  test('azureAdInfo is found for each employee', () => {
    empData.forEach(emp => {
      expect(emp.userPrincipalName === undefined || emp.userPrincipalName === null).toBe(false)
    })
  })
  test('aktiveArbeidsforhold is added if emp has aktivt arbeidsforhold', () => {
    const guri = empData.find(emp => emp.userPrincipalName === 'guri@vtfk.no')
    expect(guri.harAktivtArbeidsforhold).toBe(true)
  })
  test('aktiveArbeidsforhold is not added if emp has no aktivt arbeidsforhold', () => {
    const klaus = empData.find(emp => emp.userPrincipalName === 'klaus@vtfk.no')
    expect(klaus.harAktivtArbeidsforhold).toBe(false)
    const petter = empData.find(emp => emp.userPrincipalName === 'petter@vtfk.no')
    expect(petter.harAktivtArbeidsforhold).toBe(false)
  })
  test('codes are expanded correctly', () => {
    const guri = empData.find(emp => emp.userPrincipalName === 'guri@vtfk.no')
    expect(guri.personalressurskategori.navn).toBe('Utedo')
    expect(guri.aktiveArbeidsforhold[0].stillingskode.navn).toBe('Byggvraker')
  })
  test('arbeidssted is added correcty', () => {
    const guri = empData.find(emp => emp.userPrincipalName === 'guri@vtfk.no')
    expect(guri.aktiveArbeidsforhold[0].arbeidssted.navn).toBe('Gul videregående skole')
  })
})
