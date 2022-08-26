const getGraphToken = require('./getGraphToken')
const axios = require('axios')
const { logger } = require('@vtfk/logger')

const graphRequest = async (url) => {
  const token = await getGraphToken()
  logger('info', ['graphRequest', url.slice(0, url.indexOf('?'))])
  const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: 'eventual' } })
  logger('info', ['graphRequest', 'got data'])
  return data
}

const getOfficeLocations = async () => {
  const baseUrl = 'https://graph.microsoft.com/v1.0/users'
  const selectUrl = '$select=userType,userPrincipalName,onPremisesSamAccountName,officeLocation,onPremisesSyncEnabled'
  const filterUrl = "$filter=userType eq 'Member' and onPremisesSyncEnabled eq true and officeLocation ne null and endsWith(userPrincipalName, '@vtfk.no')"
  const countUrl = '$count=true'
  const topUrl = '$top=999'
  let url = `${baseUrl}?${selectUrl}&${filterUrl}&${countUrl}&${topUrl}`

  let finished = false
  const result = {
    count: 0,
    value: []
  }
  while (!finished) {
    const res = await graphRequest(url)
    finished = res['@odata.nextLink'] === undefined
    url = res['@odata.nextLink']
    result.value = result.value.concat(res.value)
  }
  result.count = result.value.length
  logger('info', ['getOfficeLocations', `Found ${result.count} users and their Office Location`])
  return result
}

module.exports = { getOfficeLocations }
