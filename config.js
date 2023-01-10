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
    url: process.env.FINT_URL ?? 'fitnintinintinint.no',
    graphUrl: process.env.FINT_GRAPH_URL ?? 'fintnfinininisjdjfjkd.no'
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
    orgCollection: process.env.MONGO_DB_ORG_COLLECTION ?? 'jauddaaa',
    orgStructuredCollection: process.env.MONGO_DB_ORG_STRUCTURED_COLLECTION ?? 'jauddaaa',
    competenceCollection: process.env.MONGO_DB_COMPETENCE_COLLECTION ?? 'jauddaaa',
    reportCollection: process.env.MONGO_DB_REPORT_COLLECTION ?? 'jauddaaa',
    settingsCollection: process.env.MONGO_DB_SETTINGS_COLLECTION ?? 'jauddaaa',
    criticalTasksCollection: process.env.MONGO_DB_CRITICALTASKS_COLLECTION ?? 'jauddaaa'
  },
  deleteAfterInactiveDays: process.env.DELETE_AFTER_INACTIVE_DAYS ?? 90,
  mock: !!(process.env.MOCK && process.env.MOCK === 'true'),
  appRoles: {
    admin: process.env.APP_ROLE_ADMIN_NAME ?? 'dennarollenhardualdri',
    privileged: process.env.APP_ROLE_PRIVILEGED_NAME ?? 'ikkedennerolleheller',
    applicationRead: process.env.APP_ROLE_APPLICATION_READ ?? 'ogikkedennerolleheller'
  },
  validUpnSuffix: process.env.VALID_UPN_SUFFIX || '@blublipp.no',
  leaderLevel: process.env.LEADER_LEVEL || 2,
  mail: {
    from: process.env.MAIL_FROM || 'noreply@vtfk.no',
    signature: {
      name: 'Delprosjekt HR',
      company: 'Vestfold og Telemark fylkeskommune'
    },
    secret: process.env.MAIL_SECRET || 'blubbubji',
    url: process.env.MAIL_URL || 'fhodsfjlkdsnvnnvdfk.no/mailert'
  },
  krr: {
    url: process.env.KRR_URL || 'fitnintinintininttullballmakkverk.no',
    secret: process.env.KRR_JWT_SECRET || 'dette er så hemmelig så hemmelig altså!'
  }
}
