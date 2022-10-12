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

// https://graph.microsoft.com/v1.0/users&$select=userType,userPrincipalName,onPremisesSamAccountName,officeLocation,onPremisesSyncEnabled,mobilePhone,onPremisesExtensionAttributes&$filter=userType eq 'Member' and onPremisesSyncEnabled eq true and officeLocation ne null and endsWith(userPrincipalName, '@vtfk.no')&$count=true&$top=999
const getAzureAdPersons = async (options) => {
  const baseUrl = 'https://graph.microsoft.com/v1.0/users'
  const selectUrl = '$select=userType,userPrincipalName,onPremisesSamAccountName,officeLocation,city,onPremisesSyncEnabled,mobilePhone,onPremisesExtensionAttributes'
  // const expandUrl = '$expand=manager($levels=1;$select=displayName,userPrincipalName)'
  const filterUrl = "$filter=userType eq 'Member' and onPremisesSyncEnabled eq true and officeLocation ne null and endsWith(userPrincipalName, '@vtfk.no')"
  // const filterUrl2 = "$filter=userType eq 'Member' and onPremisesSyncEnabled eq true and endsWith(userPrincipalName, '@vtfk.no')"
  const countUrl = '$count=true'
  const topUrl = options?.top ? `$top=${options.top}` : '$top=999'
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
    // for only fetching a little bit
    if (options?.top) finished = true
  }
  result.count = result.value.length
  logger('info', ['getOfficeLocations', `Found ${result.count} users and their Office Location`])
  return result
}

module.exports = { getAzureAdPersons }
