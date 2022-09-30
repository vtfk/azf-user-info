const mongo = require('../lib/mongo')
const { mongoDB } = require('../config')
const { logger, logConfig } = require('@vtfk/logger')
const switchMainCollection = require('../lib/switchMainCollection')

const employeeProjection = {
  fodselsnummer: 1,
  'azureAd.officeLocation': 1,
  'bostedsadresse.postnummer': 1,
  kjonn: 1,
  'personalressurskategori.navn': 1,
  'personalressurskategori.kode': 1,
  'aktiveArbeidsforhold.lonnsprosent': 1,
  'aktiveArbeidsforhold.stillingskode.navn': 1,
  'aktiveArbeidsforhold.arbeidssted.navn': 1,
  'aktiveArbeidsforhold.arbeidssted.kortnavn': 1
}

const competenceProjection = {
  fodselsnummer: 1,
  education: 1
}

const defaultCompetence = {
  fodselsnummer: '12345678911',
  education: []
}

module.exports = async function (context, myTimer) {
  logConfig({
    prefix: 'azf-user-info - UpdateReportCollection',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  logger('info', ['new timed run - Here we go!'])

  const db = await mongo()
  let collection = db.collection(mongoDB.employeeCollection)
  try {
    // EmployeeData
    logger('info', ['Trying to fetch employeeData'])
    const employeeData = await collection.find({ harAktivtArbeidsforhold: true }).project(employeeProjection).toArray()
    logger('info', ['Successfully fetched employeeData'])

    // CompetenceData
    logger('info', ['Trying to fetch competenceData'])
    collection = db.collection(mongoDB.competenceCollection)
    const competenceData = await collection.find({}).project(competenceProjection).toArray()
    logger('info', ['Successfully fetched competenceData'])

    logger('info', ['Merging employeeData with competenceData...'])
    const filtered = employeeData.filter(emp => emp.aktiveArbeidsforhold.find(forhold => forhold.lonnsprosent > 0) !== undefined)
    const res = filtered.map(emp => {
      const comp = competenceData.find(c => c.fodselsnummer === emp.fodselsnummer)
      const merged = {
        ...emp,
        competenceData: comp ?? defaultCompetence
      }
      delete merged.fodselsnummer
      delete merged.competenceData.fodselsnummer
      return merged
    })
    logger('info', ['Successfully merged employeeData with competenceData'])

    logger('info', ['Updating report collection with new data'])
    const updateResult = await switchMainCollection(mongoDB.reportCollection, res)
    logger('info', ['Successfully updated report collection', updateResult])
  } catch (error) {
    logger('error', error.message)
  }
}
