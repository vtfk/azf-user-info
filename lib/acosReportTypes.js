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
    alternativeTasks: "",
    newPreferredCounty: "nytt valg av fylke",
    timestamp: "datetime",
    futurePlans: "fremtidsplanse",
    preferredUnit: "unsket unitt"
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
    timestamp: "datetime"
  },
  {
    schemaName: "Innplasseringssamtale",
    acosFileName: 'id på skjema som streng',
    type: "innplasseringssamtale",
    ssn: "ansattes fødselsnummer",
    employeeNumber: "ansattnummer",
    employeeName: "ansattes navn",
    employeeUpn: "ansattes upn",
    krr: "true eller false som streng",
    firstName: "ansattes fornavn",
    lastName: "ansattes etternavn",
    managerUpn: "nærmeste leders upn",
    responsibleUpn: "Ansvarlig upn",
    responsibleName: "Ansvarlig navn",
    newUnit: 'ny enhets navn',
    newUnitId: "999",
    newOfficeLocation: "ny kontorplass",
    changedOfficeLocation: "Ja/Nei om ansatt har byttet arbeidssted/kontorplass",
    specialOfficeNeeds: "Ja/Nei - sjekk 360 sikker sone for mer info",
    legalClaimDate: "datostreng",
    newCounty: "nytt fylke",
    isResponsibleManager: "Ja/Nei/Ikke bestemt",
    newManagerName: "evt navnet på ny leder",
    documentNumber: "360 dokumentnummer",
    caseNumber: "360 saksnummer - kartleggingssaken",
    projecNumber: "360 personalprosjekt",
    documentUrl: "url til doc i 360 - eller status sendt til uregistrerte/manuelt arkivert",
    newJobTitle: "Ny stillingstittel",
    timestamp: "datetime"
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