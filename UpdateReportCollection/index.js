const mongo = require('../lib/mongo')
const { mongoDB, mock } = require('../config')
const { logger, logConfig } = require('@vtfk/logger')
const { save } = require('@vtfk/azure-blob-client')

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


const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

const mockCompetence = () => {
  const randomDegree = getRandomInt(0,4)
  const randomSubject = getRandomInt(0,4)
  const degrees = ['master', 'bachelor', 'videregående skole', 'fagbrev']
  const subjects = ['Vin', 'øl', 'Matte', 'Norsk']
  return {
    education: [
      {
      degree: degrees[randomDegree],
      subject: subjects[randomSubject]
      }
    ]
  }
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

  const db = mongo()
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
    if (mock) logger('info', ['Mock is true - generating mock-competence for users that have not set competence yet'])
    const filtered = employeeData.filter(emp => emp.aktiveArbeidsforhold.find(forhold => forhold.lonnsprosent > 0) !== undefined)
    const res = filtered.map(emp => {
      let comp = competenceData.find(c => c.fodselsnummer === emp.fodselsnummer)
      if (!comp && mock) {
        comp = mockCompetence()
      }
      const merged = {
        ...emp,
        competenceData: comp ?? defaultCompetence
      }
      delete merged.fodselsnummer
      delete merged.competenceData.fodselsnummer
      return merged
    })
    await logger('info', ['Successfully merged employeeData with competenceData'])

    await logger('info', ['Updating report blob storage with new data'])
    const createResult = await save('reportData.json', JSON.stringify(res, null, 2))
    await logger('info', ['Successfully created new report data blob', createResult])
  } catch (error) {
    await logger('error', error.message)
  }
}
