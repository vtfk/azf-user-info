const axios = require('axios').default
const getFintToken = require('./getFintToken')
const { fintClient: { url }, unknownValue } = require('../config')
const { logger } = require('@vtfk/logger')

const fintRequest = async (resource, options) => {
  if (options?.size) {
    resource = `${resource}?size=${options.size}`
    if (options.offset) resource = `${resource}&offset=${options.offset}`
  } else if (options?.offset) {
    resource = `${resource}?offset=${options.offset}`
  }
  const token = await getFintToken()
  logger('info', ['fintRequest', resource])
  const { data } = await axios.get(`${url}/${resource}`, { headers: { Authorization: `Bearer ${token}` } })
  logger('info', ['fintRequest', 'got data'])
  return data
}

const getLastElementOfUrl = (url) => {
  if (!url) return undefined
  const lastEle = url.slice(url.lastIndexOf('/') + 1)
  if (!lastEle) return undefined
  return lastEle
}

const repackLinkResource = (linkList, mulitplicity) => { // Multiplicity can be found here: https://informasjonsmodell.felleskomponent.no/docs
  if (!linkList) return undefined
  if (linkList.length === 0) return undefined
  if (mulitplicity === '1') {
    return getLastElementOfUrl(linkList[0].href)
  }
  const repackedLinkList = linkList.map(url => {
    return getLastElementOfUrl(url.href) ?? unknownValue
  }).filter(ele => ele !== unknownValue)

  return repackedLinkList
}

module.exports = { fintRequest, repackLinkResource }

// Students
/*
utdanning/elev/person
utdanning/elev/elev

bake sammen
Kanskje elevforhold også?
*/
