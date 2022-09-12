if (process.env.DEV_MODE) {
  require('dotenv').config()
}

module.exports = {
  fintClient: {
    clientId: process.env.FINT_CLIENT_ID ?? 'superId',
    clientSecret: process.env.FINT_CLIENT_SECRET ?? 'hemmelig hemmelig',
    username: process.env.FINT_USERNAME ?? 'herrBanan@nrk.no',
    password: process.env.FINT_PASSWORD ?? '1234passord',
    tokenUrl: process.env.FINT_TOKEN_URL ?? 'tututThomasToget.no',
    scope: process.env.FINT_SCOPE ?? 'etSkikkeligSkuup',
    url: process.env.FINT_URL ?? 'fitnintinintinint.tull.no'
  },
  graphClient: {
    clientId: process.env.GRAPH_CLIENT_ID ?? 'superId',
    clientSecret: process.env.GRAPH_CLIENT_SECRET ?? 'hemmelig hemmelig',
    tenantId: process.env.GRAPH_TENANT_ID ?? 'tenant id',
    scope: process.env.GRAPH_SCOPE ?? 'etSkikkeligSkuup'
  },
  unknownValue: process.env.UNKNOWN_VALUE ?? null,
  mongoDB: {
    connectionStringReadWrite: process.env.MONGO_DB_CONNECTION_STRING_READ_WRITE ?? 'tullball',
    database: process.env.MONGO_DB_DATABASE ?? 'tulliballa',
    employeeCollection: process.env.MONGO_DB_EMPLOYEE_COLLECTION ?? 'jauddaaa',
    studentCollection: process.env.MONGO_DB_STUDENT_COLLECTION ?? 'jauddaaa',
    orgCollection: process.env.MONGO_DB_ORG_COLLECTION ?? 'jauddaaa'
  },
  deleteAfterInactiveDays: process.env.DELETE_AFTER_INACTIVE_DAYS ?? 90,
  mock: !!(process.env.MOCK && process.env.MOCK === 'true')
}
