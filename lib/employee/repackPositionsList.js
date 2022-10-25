module.exports = employees => {
  const positions = []

  employees.forEach(employee => {
    const employeePositions = [...employee.aktiveArbeidsforhold, ...employee.tidligereArbeidsforhold]
    employeePositions.forEach(({ stillingstittel }) => {
      if (positions.find(position => position.toLowerCase() === stillingstittel.toLowerCase())) return
      positions.push(stillingstittel)
    })
  })

  return positions.sort()
}
