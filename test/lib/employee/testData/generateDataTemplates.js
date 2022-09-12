// USED FOR CREATING TEST DATA - needs help...

(async () => {
  const { writeFileSync } = require('fs')
  const { getDataStructure } = require('../../../../lib/employee/bakeEmployees')
  try {
    const ds = await getDataStructure()
    writeFileSync('./test/lib/employee/testData/ds.json', JSON.stringify(ds, null, 2))
    console.log('done')
  } catch (error) {
    console.log(error)
  }
})()

const clean = (entry) => {
  /* if (Array.isArray(entry)) {
      entry.forEach(ent => clean(ent));
    } else if (typeof entry === 'object' && entry !== null) {
      for (let [key, value] of Object.entries(entry)) {
        if (typeof value === 'object' && value !== null) {
          clean(value);
        } else if (Array.isArray(value)) {
          clean(value);
        }
        entry[key] = typeof entry[key]; // modified value
      }
      return entry;
    }
    return entry */
  return entry
}

// Function for seeing structure of data - used for creating test-data
const getDataStructure = async () => {
  // Kodeverk
  const resourceCategoryCodes = clean(await getResourceCategoryCodes({ size: 5 }))
  const employeePositionCodes = clean(await getEmployeePositionCodes({ size: 5 }))
  // Data from FINT
  const employeePersons = clean(await getEmployeePersons({ size: 5, offset: 1000 }))
  const employeeResources = clean(await getEmployeeResources({ size: 5, offset: 1000 }))
  const employeePositions = clean(await getEmployeePositions({ size: 5, offset: 1000 }))
  const organizationElements = clean(await getOrganizationElements({ size: 5 }))
  // Data from AzureAD
  const azureAdPersons = clean(await getAzureAdPersons({ top: 5 }))

  return {
    resourceCategoryCodes,
    employeePositionCodes,
    employeePersons,
    employeeResources,
    employeePositions,
    organizationElements,
    azureAdPersons
  }
}
