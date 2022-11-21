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
  'aktiveArbeidsforhold.arbeidssted.kortnavn': 1,
  'aktiveArbeidsforhold.hovedstilling': 1,
  'mandatoryCompetenceInput': 1
}

const mapReportData = ( raw ) => {
  const hovedstilling = raw.aktiveArbeidsforhold.find(stilling => stilling.hovedstilling)
  const tilleggstillinger = raw.aktiveArbeidsforhold.filter(stilling => !stilling.hovedstilling)
  const repacked = {
    fodselsnummer: raw.fodselsnummer ?? 'hva i huleste',
    kontorsted: raw.azureAd?.officeLocation ?? null,
    hovedarbeidsted: hovedstilling?.arbeidssted?.navn ?? null,
    hovedarbeidstedKortnavn: hovedstilling?.arbeidssted?.kortnavn ?? null,
    hovedstillingsprosent: hovedstilling?.lonnsprosent ?? null,
    tilleggstillinger,
    ansattkategori: raw.personalressurskategori?.navn,
    ansattkategoriKode: raw.personalressurskategori?.kode,
    kjonn: raw.kjonn === '1' ? 'Mann' : (raw.kjonn === '2' ? 'Kvinne' : 'Ukjent'),
    postnummer: (raw.bostedsadresse?.postnummer && Number(raw.bostedsadresse?.postnummer)) ? raw.bostedsadresse.postnummer : null,
    mandatoryCompetenceInput: raw.mandatoryCompetenceInput ?? false
  }

  return repacked
}


const competenceProjection = {
  _id: 0,
  fodselsnummer: 1,
  education: 1,
  positionTasks: 1,
  otherPositions: 1,
  workExperience: 1,
  other: 1,
  experience: 1,
  certifications: 1,
  perfCounty: 1
}


const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

const mockCompetence = () => {
  const randomDegree = getRandomInt(0,4)
  const randomSubject = getRandomInt(0,4)
  const randomTask = getRandomInt(0,4)
  const randomPosition = getRandomInt(0,4)
  const randomSoloRole = getRandomInt(0,2)
  const randomPreferredCounty = getRandomInt(0,4)
  const degrees = ['master', 'bachelor', 'videregående skole', 'fagbrev']
  const subjects = ['Vin', 'øl', 'Matte', 'Norsk']
  const tasks = [['Hoppe tau', 'Lage mat', 'Kjøre bil'], ['Klage', 'syte', 'Drikke kaffe'], ['Synge litt', 'Danse litt', 'Sette seg litt ned'], ['Power bi problemer', 'Lage for mye statistikk', 'UNne seg noe godt']]
  const positions = ['Avisbud', 'Hundefører', 'Løypemåker', 'Fugletitter']
  const soloRoles = ['Ja', 'Nei']
  const preferredCounties = ['Vet ikke', 'Telemark fylkeskommune', 'Vestfold fylkeskommune', 'Begge alternativene er like gode for meg']
  return {
    education: [
      {
        degree: degrees[randomDegree],
        subject: subjects[randomSubject],
        fromYear: 2019,
        toYear: 2022,
        "fromMonth": "Januar",
        "toMonth": "Februar",
        "school": "Livets harde skole"
      }
    ],
    tasks: tasks[randomTask],
    workExperience: [
      {
        "fromYear": 2019,
        "toYear": 2022,
        "fromMonth": "Januar",
        "toMonth": "Februar",
        "tasks": [
            "Løpe",
            "Sykle",
            "Skape overskrifter i TA",
            "",
            ""
        ],
        "position": positions[randomPosition],
        "sector": "Privat",
        "employer": "Arbeidsgiver AS"
      }
    ],
    other: {
      "soloRole": soloRoles[randomSoloRole],
      "soloRoleDescription": "Lage solobrus, og lage mat til hunder på gata"
    },
    perfCounty: preferredCounties[randomPreferredCounty]
  }
}

const defaultCompetence = {
  fodselsnummer: '12345678911',
  education: [],
  positionTasks: [],
  otherPositions: [],
  workExperience: [],
  other: {
    soloRole: null,
    soloRoleDescription: null,
  },
  experience: [],
  certifications: [],
  perfCounty: null
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
    const employeeData = await collection.find({ harAktivtArbeidsforhold: true, mandatoryCompetenceInput: true }).project(employeeProjection).toArray()
    logger('info', ['Successfully fetched employeeData'])

    // CompetenceData
    logger('info', ['Trying to fetch competenceData'])
    collection = db.collection(mongoDB.competenceCollection)
    const competenceData = await collection.find({}).project(competenceProjection).toArray()
    logger('info', ['Successfully fetched competenceData'])

    logger('info', ['Merging employeeData with competenceData...'])
    if (mock) logger('info', ['Mock is true - generating mock-competence for users that have not set competence yet'])

    let res = employeeData.map((emp) => mapReportData(emp))
    res = employeeData.map(emp => {
      let comp = competenceData.find(c => c.fodselsnummer === emp.fodselsnummer)
      if (mock) {
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
