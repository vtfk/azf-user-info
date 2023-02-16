const mongo = require('../lib/mongo')
const { mongoDB, appRoles } = require('../config')
const { verifyToken } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')

const chooseCollection = (county) => {
  if (county === 'tfk') return mongoDB.telemarkOrgCollection
  if (county === 'vfk') return mongoDB.vestfoldOrgCollection
  return undefined
}

const getCountyName = (county) => {
  if (county === 'tfk') return 'Telemark fylkeskommune'
  if (county === 'vfk') return 'Vestfold fylkeskommune'
  return county
}

const newUnit = (data, county) => {
  const unit = {
    organisasjonsId: new Date().getTime().toString(),
    kortnavn: data.kortnavn,
    navn: data.navn,
    organisasjonsnummer: data.organisasjonsnummer ?? '12345',
    organisasjonsKode: data.organisasjonsKode ?? '123',
    gyldighetsperiode: {
      start: new Date().toISOString(),
      slutt: null
    },
    leder: null,
    midlertidigLeder: null,
    overordnet: null,
    underordnet: [],
    arbeidsforhold: [],
    fylke: getCountyName(county)
  }
  return unit
}


module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-user-info - HandleCounty',
    azure: {
      context,
      excludeInvocationId: true
    }
  })
  // Verify token
  const ver = verifyToken(req.headers.authorization)
  if (!ver.verified) return { status: 401, body: `You are not authorized to view this resource, ${ver.msg}` }

  const privileged = ver.roles.includes(appRoles.admin)
  logger('info', ['checked if has privileged role - result', privileged])
  if (!privileged) return { status: 401, body: 'You do not have sufficient permissions to use this resource' }


  // Her begynner moroa

  /*
  Skal kunne opprette en ny enhet - enten i Telemark eller i Vestfold
  Må ha fastsatte felter, så det ikke blir kræsj når man prøver å hente data - trenger et skjema altså
  Skal kunne oppdatere en enhet i Telemark eller i Vestfold - kanskje bare opprette ny enhet dersom den ikke finnes, overskrive enhet dersom den finnes.

   - Må kunne legge til/fjerne ansattforhold fra en enhet
   - Må kunne legge til/fjerne underordnede enheter (og automatisk sette overordnet på underenheter)
   - Må kunne endre overordnet enhet

  */
  if (!req.body) {
    return { status: 401, body: `You need a body, no ghosts allowed!` }
  }
  const { method, county, data } = req.body
  const allowedMethods = ['createUnit', 'updateUnit', 'handleUnderordnet', 'changeOverodnet', 'handleEmployee', 'setManager']
  const allowedCounties = ['tfk', 'vfk']
  if (!allowedCounties.includes(county)) return { status: 401, body: `county ${county} is not allowed, must be ${allowedCounties.join(' or ')}` }
  if (!allowedMethods.includes(method)) return { status: 401, body: `method ${method} is not allowed, must be ${allowedMethods.join(' or ')}` }
  if (!data || typeof data !== 'object') return { status: 401, body: `"data" is required and must be object` }

  if (method === 'createUnit') {
    const { kortnavn, navn } = data
    if (!(kortnavn && navn)) return { status: 400, body: 'Missing required parameter. Must have "kortnavn" and "navn"'}
    const unit = newUnit(data, county)
    const db = mongo()
    const collection = db.collection(chooseCollection(county))
    const insertRes = await collection.insertOne(unit)

    return { status: 200, body: { insertRes, organisasjonsId: unit.organisasjonsId } }
  }

  if (method === 'setManager') {
    const { ansattnummer, upn, type, organisasjonsId } = data
    if (!(ansattnummer || upn)) return { status: 400, body: 'Missing required parameter. Must have "ansattnummer" or "upn"'}
    if (!type || !['leder', 'midlertidigLeder'].includes(type)) return { status: 400, body: '"type" is required, and must be "leder" or "midlertidigLeder"'}
    if (!organisasjonsId) return { status: 400, body: 'missing required parameter "organisasjonsId"'}

    const db = mongo()
    let collection = db.collection(mongoDB.orgCollection)
    let query
    if (ansattnummer) {
      query = { 'arbeidsforhold.ansattnummer': ansattnummer, 'arbeidsforhold.hovedstilling': true }
    } else if (upn) {
      query = { 'arbeidsforhold.userPrincipalName': upn, 'arbeidsforhold.hovedstilling': true }
    }
    const org = await collection.findOne(query)
    const manager = org.arbeidsforhold.find(emp => (emp.userPrincipalName === upn || emp.ansattnummer === ansattnummer) && emp.hovedstilling)
    delete manager.arbeidssted

    collection = db.collection(chooseCollection(county))
    const updateRes = await collection.updateOne({organisasjonsId: organisasjonsId}, { $set: { [type]: manager } })
    
    return { status: 200, body: { updateRes, organisasjonsId } }
  }

  if (method === 'updateUnit') {
    return { status: 200, body: "Dette funker ikke enda" }
  }

  if (method === 'handleEmployee') {
    const { ansattnummer, upn, organisasjonsId, type } = data
    if (!(ansattnummer || upn)) return { status: 400, body: 'Missing required parameter. Must have "ansattnummer" or "upn"'}
    if (!organisasjonsId) return { status: 400, body: 'missing required parameter "organisasjonsId"'}
    if (!type || !['add', 'remove'].includes(type)) return { status: 400, body: '"type" is required, and must be "add" or "remove"'}

    const db = mongo()
    let collection = db.collection(mongoDB.orgCollection)
    let query
    if (ansattnummer) {
      query = { 'arbeidsforhold.ansattnummer': ansattnummer, 'arbeidsforhold.hovedstilling': true }
    } else if (upn) {
      query = { 'arbeidsforhold.userPrincipalName': upn, 'arbeidsforhold.hovedstilling': true }
    }
    const org = await collection.findOne(query)
    const employee = org.arbeidsforhold.find(emp => (emp.userPrincipalName === upn || emp.ansattnummer === ansattnummer) && emp.hovedstilling)
    delete employee.arbeidssted

    collection = db.collection(chooseCollection(county))
    const addUnit = await collection.findOne({ organisasjonsId: organisasjonsId })
    let newArbeidsforhold = addUnit.arbeidsforhold
    if (type === 'add'){
      if (!newArbeidsforhold.find(forhold => forhold.ansattnummer === employee.ansattnummer)) newArbeidsforhold.push(employee)
    } else if (type === 'remove') {
      if (newArbeidsforhold.find(forhold => forhold.ansattnummer === employee.ansattnummer)) newArbeidsforhold = newArbeidsforhold.filter(forhold => forhold.ansattnummer !== employee.ansattnummer)
    }
    const updateRes = await collection.updateOne({ organisasjonsId: organisasjonsId }, { $set: { arbeidsforhold: newArbeidsforhold } })
    
    return { status: 200, body: { updateRes, organisasjonsId } }
  }

  if (method === 'handleUnderordnet') {
    // Legg til en enhet som underordnet
    const { organisasjonsId, underordnet, type } = data
    if (!organisasjonsId || !underordnet) return { status: 400, body: 'missing required parameters "organisasjonsId" and "underordnet"'}
    if (!type || !['add', 'remove'].includes(type)) return { status: 400, body: '"type" is required, and must be "add" or "remove"'}
    
    const db = mongo()
    let collection = db.collection(chooseCollection(county))
    const underordnetObj = await collection.findOne({ organisasjonsId: underordnet })
    if (!underordnetObj) return { status: 404, body: `Enhet med id ${underordnet} finnes ikke i collection for ${county}` }
    const overordnetObj = await collection.findOne({ organisasjonsId: organisasjonsId })
    if (!overordnetObj) return { status: 404, body: `Enhet med id ${organisasjonsId} finnes ikke i collection for ${county}` }
    const underordnetToAdd = {
      id: underordnetObj.organisasjonsId,
      navn: underordnetObj.navn
    }
    let newUnderordnetList = overordnetObj.underordnet
    if (type === 'add'){
      if (!newUnderordnetList.find(unit => unit.id === underordnetToAdd.id)) newUnderordnetList.push(underordnetToAdd)
    } else if (type === 'remove') {
      if (newUnderordnetList.find(unit => unit.id === underordnetToAdd.id)) newUnderordnetList = newUnderordnetList.filter(unit => unit.id !== underordnetToAdd.id)
    }
    const updateUnitRes = await collection.updateOne({ organisasjonsId: organisasjonsId }, { $set: { underordnet: newUnderordnetList } })

    // Oppdater den nye underordnede med ny overordnet verdi
    let overordnetToAdd = null
    if (type === 'add') {
      overordnetToAdd = {
        id: overordnetObj.organisasjonsId,
        navn: overordnetObj.navn
      }
    }
    const updateUnderordnetRes = await collection.updateOne({ organisasjonsId: underordnet }, { $set: { overordnet: overordnetToAdd } })

    return { status: 200, body: { updateUnitRes, updateUnderordnetRes, organisasjonsId, underordnet } }
  }
}