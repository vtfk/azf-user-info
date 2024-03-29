const nl = '\n'

const { getArbeidsforholdsType } = require('./employee/employeeProjections')

const repackPositionTasks = (positionTasks, employee) => {
  if (!positionTasks || positionTasks.length === 0) return 'Ingen arbeidsoppgaver registrert'
  let taskString = ''
  for (const task of positionTasks) {
    const activePos = employee.aktiveArbeidsforhold.find(forhold => {
      forhold.systemId.substring(0, forhold.systemId.lastIndexOf('--')) === task.positionId
      const posId = task.positionId.split('--').length > 2 ? task.positionId.substring(0, task.positionId.lastIndexOf('--')) : task.positionId
      return forhold.systemId.substring(0, forhold.systemId.lastIndexOf('--')) === posId
    })
    if (activePos) {
      taskString += `${activePos.stillingstittel} - ${activePos.arbeidssted.navn}${nl}`
      for (const t of task.tasks) {
        taskString += `\t- ${t}${nl}`
      }
      taskString += nl
    }
  }
  if (taskString.length === 0) return 'Ingen arbeidsoppgaver registrert'
  return taskString
}

const repackOtherPositions = (positionTasks, otherPositions) => {
  if (!otherPositions || otherPositions.length === 0) return ''
  let taskString = ''
  for (const task of positionTasks) {
    const otherPos = otherPositions.find(pos => pos.systemId === task.positionId)
    if (otherPos) taskString += `${otherPos.title}${nl}`
    if (otherPos && task.tasks.length > 0) {
      for (const t of task.tasks) {
        taskString += `\t- ${t}${nl}`
      }
    }
    if (otherPos) taskString += nl
  }
  return taskString
}

const repackWorkExperience = workExperience => {
  if (!workExperience || workExperience.length === 0) return `Ingen tidligere arbeidsforhold registrert ${nl}`
  let expString = ''
  for (const exp of workExperience) {
    expString += `- ${exp.fromYear} - ${exp.toYear}. ${exp.position} - ${exp.employer}${nl}`
    for (const task of exp.tasks) {
      expString += `\t - ${task}${nl}`
    }
    expString += nl
  }
  return expString
}

const repackEducation = education => {
  if (!education || education.length === 0) return 'Ingen utdanning registrert'
  let eduString = ''
  for (const edu of education) {
    eduString += `- ${edu.fromYear} - ${edu.toYear}. ${edu.degree} ${edu.subject} - ${edu.school}${nl}${nl}`
  }
  return eduString
}

const repackCertifications = certifications => {
  if (!certifications || certifications.length === 0) return 'Ingen sertifiseringer eller kurs registrert'
  let certString = ''
  for (const cert of certifications) {
    certString += `- ${cert.year}${cert.yearEnd ? ' - ' + cert.yearEnd : ''}. ${cert.type}: ${cert.name}${nl}${nl}`
  }
  return certString
}

const repackExperience = experience => {
  if (!experience || experience.length === 0) return 'Ingen verv registrert'
  let expString = ''
  for (const exp of experience) {
    expString += `- ${exp.fromYear}${exp.toYear ? ' - ' + exp.toYear : ''}. ${exp.position}: ${exp.organization}${nl}${nl}`
  }
  return expString
}

const repackCriticalTask = criticalTask => {
  if (!criticalTask) return 'Ingen kritiske oppgaver registrert'
  let criticalString = ''
  criticalString += criticalTask.soloRole && criticalTask.soloRole.length > 0 ? criticalTask.soloRole : 'Ingen kritiske oppgaver registrert'
  criticalString += criticalTask.soloRole && criticalTask.soloRole === 'Ja' && criticalTask.soloRoleDescription ? ` - ${criticalTask.soloRoleDescription}` : ''
  return criticalString
}

const repackStillingskode = aktiveArbeidsforhold => {
  const hovedstilling = aktiveArbeidsforhold.find(stilling => stilling.hovedstilling)
  const stillingskode = hovedstilling ? hovedstilling.stillingskode : { kode: 'Fant ikke hovedstilling, fyll inn manuelt', navn: '' }
  return `${stillingskode.kode} - ${stillingskode.navn}`
}

const repackForholdstype = aktiveArbeidsforhold => {
  const hovedstilling = aktiveArbeidsforhold.find(stilling => stilling.hovedstilling)
  let forholdstype = hovedstilling ? getArbeidsforholdsType(hovedstilling.arbeidsforholdstype) : ''
  if (forholdstype === 'ikkeRelevant' || forholdstype === '') return ''
  return ` (${forholdstype})`
}

const removeSpecialCharacters = (str) => {
  return str.replace(/[^a-zA-Z0-9ÆØÅæøå .,-@&%()öäü$àèùñ\n\t\r\"\'\\\/]/g, "")
}

const repackCompetence = (employee, competence, krr, success) => {
  return {
    krr: !!(krr && krr.varslingsstatus === 'KAN_VARSLES'),
    ssn: employee.fodselsnummer || 'ukjent fnr',
    name: employee.navn || 'ukjent bruker',
    firstName: employee.fornavn || 'ukjent fornavn',
    lastName: employee.etternavn || 'ukjent etternavn',
    employeeNumber: employee.ansattnummer || 'ukjent ansattnummer',
    caseNumber: employee.caseNumber || null,
    stillingskode: removeSpecialCharacters(repackStillingskode(employee.aktiveArbeidsforhold ?? [])),
    positionTasks: removeSpecialCharacters(repackPositionTasks(competence?.positionTasks, employee)),
    otherPositions: removeSpecialCharacters(repackOtherPositions(competence?.positionTasks, competence?.otherPositions)),
    workExperience: removeSpecialCharacters(repackWorkExperience(competence?.workExperience)),
    education: removeSpecialCharacters(repackEducation(competence?.education)),
    certifications: removeSpecialCharacters(repackCertifications(competence?.certifications)),
    verv: removeSpecialCharacters(repackExperience(competence?.experience)),
    preferredCounty: competence?.perfCounty || 'Foretrukket arbeidssted/fylkeskommune ikke registrert',
    criticalTask: removeSpecialCharacters(repackCriticalTask(competence?.other)),
    msg: employee.msg ?? '',
    success
  }
}

const repackInnplassering = (employee, newUnit, krr, success) => {
  return {
    ssn: employee.fodselsnummer || 'ukjent fnr',
    name: employee.navn || 'ukjent bruker',
    firstName: employee.fornavn || 'ukjent fornavn',
    lastName: employee.etternavn || 'ukjent etternavn',
    employeeNumber: employee.ansattnummer || 'ukjent ansattnummer',
    stillingskode: removeSpecialCharacters(`${repackStillingskode(employee.aktiveArbeidsforhold ?? [])}${repackForholdstype(employee.aktiveArbeidsforhold)}`),
    caseNumber: employee.caseNumber || null,
    newUnitName: newUnit?.navn || 'fant ikke ny enhet',
    newUnitShortName: newUnit?.kortnavn || 'fant ikke ny enhet',
    newUnitId: newUnit?.organisasjonsId || 'fant ikke ny enhet',
    newUnitCounty: newUnit?.fylke || 'fant ikke ny enhet',
    krr: !!(krr && krr.varslingsstatus === 'KAN_VARSLES'),
    msg: employee.msg ?? '',
    success
  }
}


module.exports = { repackCompetence, repackInnplassering }
