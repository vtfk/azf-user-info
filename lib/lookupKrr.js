const axios = require('axios')
const { krr: { url, secret } } = require('../config')
const generateSystemJwt = require('./generateJwt')

module.exports = async ssn => {
  if (!ssn) throw new Error(`Missing required parameter ${ssn}`)
  const { data } = await axios.post(url, [ssn], { headers: { Authorization: generateSystemJwt(secret) } })
  if (data.personer && Array.isArray(data.personer) && data.personer.length === 1) {
    const person = data.personer[0]
    if (!person.kontaktinformasjon.epostadresse) person.varslingsstatus = 'KAN_IKKE_VARSLES'
    return person
  } else {
    return { varslingsstatus: 'KAN_IKKE_VARSLES' }
  }
}
