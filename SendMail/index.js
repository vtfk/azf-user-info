const { logConfig, logger } = require('@vtfk/logger')
const { appRoles } = require('../config')
const sendMail = require('../lib/sendMail')
const { verifyToken } = require('../lib/verifyToken')

/*
Takes in list of receivers, and email text
*/

module.exports = async function (context, req) {
    logConfig({
      prefix: 'azf-user-info - SendMail',
      azure: {
        context,
        excludeInvocationId: true
      }
    })
    logger('info', ['new request - validating roles and upn'])
    // Verify token
    const ver = verifyToken(req.headers.authorization)
    if (!ver.verified) return { status: 401, body: `You are not authorized to view this resource, ${ver.msg}` }
  
    let admin = ver.roles.includes(appRoles.admin)
    if (!admin) return { status: 401, body: `You are not authorized to view this resource, only available for admin role` }
    logger('info', [ver.upn, 'checked if has admin role - result', admin])

    if (typeof req.body !== 'object') return { status: 400, body: 'That is not an object body' }
    const body = req.body
    if (!body.receivers) return { status: 400, body: 'missing required property "receivers"' }
    if (!Array.isArray(body.receivers)) return { status: 400, body: 'property "receivers" must be array' }
    if (!body.emailSubject) return { status: 400, body: 'missing required property "emailSubject"' }
    if (typeof body.emailSubject !== 'string') return { status: 400, body: 'property "emailSubject" must be string'}
    if (!body.emailBody) return { status: 400, body: 'missing required property "emailBody"' }
    if (typeof body.emailBody !== 'string') return { status: 400, body: 'property "emailBody" must be string'}

    try {
        const res = await sendMail({
            to: body.receivers,
            subject: body.emailSubject,
            body: body.emailBody
        })
        if (res.failed.length > 0) {
            await logger('warn', [ver.upn, 'sendMail worked, but failed for some receivers', res.failed])
            return { status: 200, body: res }
        }
        await logger('info', [ver.upn, `sent mail to ${body.receivers.length} persons`])
        return { status: 200, body: res }
    } catch (error) {
        await logger('error', [ver.upn, 'sendMail failed', error])
        return { status: 500, body: error.message }
    }
}