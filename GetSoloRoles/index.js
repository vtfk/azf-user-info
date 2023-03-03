const mongo = require('../lib/mongo')
const { mongoDB, appRoles} = require('../config')
const { verifyAppToken } = require('../lib/verifyToken')
const { logger, logConfig } = require('@vtfk/logger')

//Projections
criticalTasksCollectionProjection = {
    _id: 0, 
    ansattnummer: 1
}

employeeCollectionProjection = {
    _id: 0, 
    navn: 1,
    ansattnummer: 1,
    fodselsnummer: 1,
    "azureAd.officeLocation": 1
}

competenceCollectionProjection = {
    _id: 0, 
    fodselsnummer: 1,
    "other.soloRoleDescription": 1,
    "perfCounty": 1
}
// End of projections

module.exports = async function (context, req) {
    logConfig({
        prefix: 'azf-user-info - Critical Tasks from mongoDB collection',
        azure: {
            context,
            excludeInvocationId: true
        }
    })

    const ver = verifyAppToken(req.headers.authorization)
    if (!ver.verified) {
        return {
            status: 401,
            body: `You are not authorized to view this resource, ${ver.msg}`
        }
    }

    // If the user do not have the right role throw error
    const privileged = ver.roles.includes(appRoles.admin || appRoles.privileged)
    logger('info', ['checked if has privileged role - result', privileged])
    if (!privileged) return { status: 401, body: 'You do not have sufficient permissions to use this resource' }

    try {
        const db = mongo()
        // Find ansattnummer in criticalTasks collection
        logger('info', ['Trying to get employees with critical tasks'])
        const collectionCritical = db.collection(mongoDB.criticalTasksCollection)
        const ansattNummer = await collectionCritical.find({criticalTask: true}).project(criticalTasksCollectionProjection).toArray()
        logger('info', ['Successfully found employees with critical tasks '])
        const employeeNumber = ansattNummer.map(ansatt => ansatt.ansattnummer)
        
        // Get employee info
        logger('info', ['Trying find employee info'])
        const collectionEmployee = db.collection(mongoDB.employeeCollection)
        const ansattInfo = await collectionEmployee.find({ansattnummer: {$in: employeeNumber}}).project(employeeCollectionProjection).toArray()
        logger('info', ['Successfully found employee info'])
        const birthNumber = ansattInfo.map(ansatt => ansatt.fodselsnummer)

        // Get critical tasks description
        logger('info', ['Trying find the critical tasks for the employees with critical tasks'])
        const collectionCompetence = db.collection(mongoDB.competenceCollection)
        const ansattCompetence = await collectionCompetence.find({fodselsnummer: {$in: birthNumber}}).project(competenceCollectionProjection).toArray()
        logger('info', ['Successfully found the critical tasks'])

        logger('info', ['Merging critical task competence with employee info'])
        const data = ansattInfo.map(ansatt => {
            const index = ansattCompetence.findIndex(comp => comp.fodselsnummer === ansatt.fodselsnummer)
            const mergeData = {
                ...ansatt,
                ...ansattCompetence[index]
            }
            delete mergeData.fodselsnummer
            logger('info', ['Successfully merged critical task competence with employee info'])
            return mergeData
        })

        logger('info', ['Successfully returned critical tasks'])

        return{
            status: 200, body: data
        }
    } catch (error) {
        logger('info', ['Oh, something went wrong'])
        return {
            status: 500, body: error.message
        }
    }
}
