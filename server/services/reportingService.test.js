const moment = require('moment')
const serviceCreator = require('./reportingService')

const reportingClient = {
  getMostOftenInvolvedStaff: jest.fn(),
  getMostOftenInvolvedPrisoners: jest.fn(),
  getIncidentsOverview: jest.fn(),
}

const offenderService = {
  getOffenderNames: jest.fn(),
}

let service

beforeEach(() => {
  service = serviceCreator({ reportingClient, offenderService })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('reportingService', () => {
  it('getMostOftenInvolvedStaff', async () => {
    reportingClient.getMostOftenInvolvedStaff.mockReturnValue([
      { userId: 'AAAA', name: 'Arthur', count: 20 },
      { userId: 'BBBB', name: 'Bella', count: 10 },
      { userId: 'CCCC', name: 'Charlotte', count: 5 },
    ])

    const date = moment({ years: 2019, months: 1 })
    const startDate = moment(date).startOf('month')
    const endDate = moment(date).endOf('month')

    const result = await service.getMostOftenInvolvedStaff('LEI', 2, 2019)

    expect(result).toEqual(`Staff member name,Count
Arthur,20
Bella,10
Charlotte,5
`)

    expect(reportingClient.getMostOftenInvolvedStaff).toBeCalledWith('LEI', [startDate, endDate])
  })

  it('getMostOftenInvolvedPrisoners', async () => {
    offenderService.getOffenderNames.mockReturnValue({
      AAAA: 'Arthur',
      BBBB: 'Bella',
      CCCC: 'Charlotte',
    })

    reportingClient.getMostOftenInvolvedPrisoners.mockReturnValue([
      { offenderNo: 'AAAA', count: 20 },
      { offenderNo: 'BBBB', count: 10 },
      { offenderNo: 'CCCC', count: 5 },
    ])

    const date = moment({ years: 2019, months: 1 })
    const startDate = moment(date).startOf('month')
    const endDate = moment(date).endOf('month')

    const result = await service.getMostOftenInvolvedPrisoners('token-1', 'LEI', 2, 2019)

    expect(result).toEqual(`Prisoner name,Count
Arthur,20
Bella,10
Charlotte,5
`)

    expect(reportingClient.getMostOftenInvolvedPrisoners).toBeCalledWith('LEI', [startDate, endDate])
    expect(offenderService.getOffenderNames).toBeCalledWith('token-1', ['AAAA', 'BBBB', 'CCCC'])
  })

  it('getIncidentsOverview', async () => {
    reportingClient.getIncidentsOverview.mockReturnValue([
      {
        total: 'total-1',
        planned: 'planned-1',
        unplanned: 'unplanned-1',
        handcuffsApplied: 'handcuffsApplied-1',
        batonDrawn: 'batonDrawn-1',
        batonUsed: 'batonUsed-1',
        pavaDrawn: 'pavaDrawn-1',
        pavaUsed: 'pavaUsed-1',
        personalProtectionTechniques: 'personalProtectionTechniques-1',
        cctvRecording: 'cctvRecording-1',
        bodyWornCamera: 'bodyWornCamera-1',
        bodyWornCameraUnknown: 'bodyWornCameraUnknown-1',
      },
    ])

    const date = moment({ years: 2019, months: 1 })
    const startDate = moment(date).startOf('month')
    const endDate = moment(date).endOf('month')

    const result = await service.getIncidentsOverview('LEI', 2, 2019)

    expect(result)
      .toEqual(`Total,Planned incidents,Unplanned incidents,Handcuffs applied,Baton drawn,Baton used,Pava drawn,Pava used,Personal protection techniques,CCTV recording,Body worn camera recording,Body worn camera recording unknown
total-1,planned-1,unplanned-1,handcuffsApplied-1,batonDrawn-1,batonUsed-1,pavaDrawn-1,pavaUsed-1,personalProtectionTechniques-1,cctvRecording-1,bodyWornCamera-1,bodyWornCameraUnknown-1
`)

    expect(reportingClient.getIncidentsOverview).toBeCalledWith('LEI', [startDate, endDate])
  })
})
