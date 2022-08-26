const ClientOAuth2 = require('client-oauth2')
const NodeCache = require('node-cache')
const { fintClient } = require('../config')
const { logger } = require('@vtfk/logger')

const cache = new NodeCache({ stdTTL: 3000 })

module.exports = async (forceNew = false) => {
  const cacheKey = 'fintToken'

  if (!forceNew && cache.get(cacheKey)) {
    logger('info', ['getFintToken', 'found valid token in cache, will use that instead of fetching new'])
    return (cache.get(cacheKey))
  }

  logger('info', ['getFintToken', 'no token in cache, fetching new from FINT'])
  const clientOptions = {
    accessTokenUri: fintClient.tokenUrl,
    clientId: fintClient.clientId,
    clientSecret: fintClient.clientSecret,
    scopes: [fintClient.scope]
  }
  const { accessToken, data } = await new ClientOAuth2(clientOptions).owner.getToken(fintClient.username, fintClient.password)
  logger('info', ['getFintToken', 'token fetched from FINT'])
  cache.set(cacheKey, accessToken, data.expires_in)
  logger('info', ['getFintToken', 'token cached for further use', `Token expires in ${data.expires_in} seconds`])
  return accessToken
}
