const acosReportTypes = [
  {
    schemaName: "Kartleggingssamtale",
    type: "kartleggingssamtale-out",
    ssn: "ansattes fødselsnummer",
    employeeName: "ansattes navn",
    employeeNumber: "ansattnummer",
    firstName: "ansattes fornavn",
    lastName: "ansattes etternavn",
    managerUpn: "leders upn",
    manager: "Leders navn",
    documentNumber: "360 dokumentnummer",
    caseNumber: "360 saksnummer - kartleggingssaken",
    projecNumber: "360 personalprosjekt",
    documentUrl: "url til doc i 360 - eller status sendt til uregistrerte/manuelt arkivert",
    specialNeeds: "",
    preferredCounty: "foretrukken fylkeskommune",
    changedCountyOpinion: "",
    newPreferredCounty: "nytt valg av fylke",
    timestamp: "datetime"
  },
  {
    schemaName: "Kartleggingssamtale - signert",
    type: "kartleggingssamtale-in",
    approved: "",
    ssn: "ansattes fødselsnummer",
    employeeNumber: "ansattnummer",
    employeeName: "ansattes navn",
    firstName: "ansattes fornavn",
    lastName: "ansattes etternavn",
    managerUpn: "leders upn",
    manager: "Leders navn",
    managerApprovedTimestamp: "datetime",
    documentNumber: "360 dokumentnummer",
    caseNumber: "360 saksnummer - kartleggingssaken",
    projecNumber: "360 personalprosjekt",
    documentUrl: "url til doc i 360 - eller status sendt til uregistrerte/manuelt arkivert",
    timestamp: "datetime",
  }
]

const verifyInput = (reportPayload) => {
  const correspondingSchema = acosReportTypes.find(schema => schema.type === reportPayload.type)
  if (!correspondingSchema) throw new Error(`"${reportPayload.type}" is not a valid report type `)
  for (const [prop, value] of Object.entries(correspondingSchema)) {
    // Check if prop exists in reportPayload
    if (!reportPayload.hasOwnProperty(prop)) throw new Error(`"${reportPayload.type}" must be on the form ${JSON.stringify(correspondingSchema, null, 2)} \n Payload is missing prop ${prop}`)
    // Check if value is of same type as in correspoding reportType
    if (typeof value !== typeof reportPayload[prop]) throw new Error(`"${reportPayload.type}" must be on the form ${JSON.stringify(correspondingSchema, null, 2)} \n Payload has illegal type in ${prop}`)
  }
  for (const prop of Object.keys(reportPayload)) {
    // Check if payload has data that is not allowed
    if (!correspondingSchema.hasOwnProperty(prop)) throw new Error(`"${reportPayload.type}" does not allow property: "${prop}"`)
  }
}

module.exports = { verifyInput }