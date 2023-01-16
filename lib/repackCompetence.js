const repackPositionTasks = (positionTasks, employee) => {
  if (!positionTasks || positionTasks.length === 0) return 'Ingen arbeidsoppgaver registrert'
  let taskString = ''
  for (const task of positionTasks) {
    const activePos = employee.aktiveArbeidsforhold.find(forhold => forhold.systemId.substring(0, forhold.systemId.lastIndexOf('--')) === task.positionId)
    if (activePos && task.tasks.length > 0) {
      taskString += `${activePos.stillingstittel} - ${activePos.arbeidssted.navn}\n`
      for (const t of task.tasks) {
        taskString += `- ${t}\n`
      }
      taskString += '\n'
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
    if (otherPos) taskString += `${otherPos.title}\n`
    if (otherPos && task.tasks.length > 0) {
      for (const t of task.tasks) {
        taskString += `- ${t}\n`
      }
      taskString += '\n'
    }
  }
  return taskString
}

const repackWorkExperience = workExperience => {
  if (!workExperience || workExperience.length === 0) return 'Ingen tidligere arbeidsforhold registrert'
  let expString = ''
  for (const exp of workExperience) {
    expString += `- ${exp.fromYear} - ${exp.toYear}. ${exp.position} - ${exp.employer}\n`
  }
  return expString
}

const repackEducation = education => {
  if (!education || education.length === 0) return 'Ingen utdanning registrert'
  let eduString = ''
  for (const edu of education) {
    eduString += `- ${edu.fromYear} - ${edu.toYear}. ${edu.degree} ${edu.subject} - ${edu.school}\n`
  }
  return eduString
}

const repackCertifications = certifications => {
  if (!certifications || certifications.length === 0) return 'Ingen sertifiseringer eller kurs registrert'
  let certString = ''
  for (const cert of certifications) {
    certString += `- ${cert.year} - ${cert.yearEnd}. ${cert.type}: ${cert.name}\n`
  }
  return certString
}

const repackExperience = experience => {
  if (!experience || experience.length === 0) return 'Ingen verv registrert'
  let expString = ''
  for (const exp of experience) {
    expString += `- ${exp.fromYear} - ${exp.toYear}. ${exp.position}: ${exp.organization}\n`
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

module.exports = (employee, competence, krr, success) => {
  return {
    krr: !!(krr && krr.varslingsstatus === 'KAN_VARSLES'),
    ssn: employee.fodselsnummer || 'ukjent fnr',
    name: employee.navn || 'ukjent bruker',
    employeeNumber: employee.ansattnummer || 'ukjent ansattnummer',
    stillingskode: repackStillingskode(employee.aktiveArbeidsforhold ?? []),
    positionTasks: repackPositionTasks(competence?.positionTasks, employee),
    otherPositions: repackOtherPositions(competence?.positionTasks, competence?.otherPositions),
    workExperience: repackWorkExperience(competence?.workExperience),
    education: repackEducation(competence?.education),
    certifications: repackCertifications(competence?.certifications),
    verv: repackExperience(competence?.experience),
    preferredCounty: competence?.perfCounty || 'Foretrukket arbeidssted/fylkeskommune ikke registrert',
    criticalTask: repackCriticalTask(competence?.other),
    msg: employee.msg ?? '',
    success
  }
}
