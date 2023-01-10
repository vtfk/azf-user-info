const axios = require('axios').default
const { mail: { from, signature, url, secret } } = require('../config')

module.exports = async options => {
  const { to, subject, body } = options
  const payload = {
    to,
    from,
    subject,
    type: 'bulk',
    template: {
      templateName: 'vtfk',
      templateData: {
        body,
        signature
      }
    }
  }
  const { data } = await axios.post(`${url}?subscription-key=${secret}`, payload)
  return data
}
