const findPersonDiff = require('../../lib/findPersonDiff')

const oldPersons = [
  {
    fodselsnummer: '12345678910',
    fintStatus: {
      active: true,
      lastFetched: '2022-08-29T09:34:25.571Z'
    }
  },
  {
    fodselsnummer: '12345678911',
    fintStatus: {
      active: true,
      lastFetched: new Date().toISOString()
    }
  },
  {
    fodselsnummer: '12345678912',
    fintStatus: {
      active: true,
      lastFetched: '2022-08-29T09:34:25.571Z'
    }
  },
  {
    fodselsnummer: '12345678913',
    fintStatus: {
      active: true,
      lastFetched: '2022-08-29T09:34:25.571Z'
    }
  },
  {
    fodselsnummer: '12345678914',
    fintStatus: {
      active: false,
      lastFetched: '2020-08-29T09:34:25.571Z'
    }
  }
]

const newPersons = [
  {
    fodselsnummer: '12345678910'
  },
  {
    fodselsnummer: '12345678912'
  },
  {
    fodselsnummer: '12345678913'
  }
]

test('Person is set to false and pushed to new array when not present in newData', () => {
  const newData = findPersonDiff(oldPersons, newPersons)
  expect(newData.find(person => person.fodselsnummer === '12345678911' && person.fintStatus.active === false).fodselsnummer).toBe('12345678911')
})
test('Person is not included in result if lastFetched is above deleteAfterInactiveDays', () => {
  const newData = findPersonDiff(oldPersons, newPersons)
  expect(newData.find(person => person.fodselsnummer === '12345678914')).toBe(undefined)
})
