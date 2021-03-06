import moment from 'moment'
import { ReportStatus } from '../config/types'
import ReportingClient from './reportingClient'

let reportingClient: ReportingClient
const query = jest.fn()

beforeEach(() => {
  jest.resetAllMocks()
  reportingClient = new ReportingClient(query)
  query.mockResolvedValue({ rows: [] })
})

describe('reportingClient', () => {
  describe('getMostOftenInvolvedStaff', () => {
    test('it should pass on the correct sql', () => {
      const agencyId = 'LEI'
      const startDate = moment()
      const endDate = moment().add(1, 'month')

      reportingClient.getMostOftenInvolvedStaff(agencyId, [startDate, endDate])

      expect(query).toBeCalledWith({
        text: `
          select 
            s.name, count(*) 
          from 
            statement s
            join report r on r.id = s.report_id
          where 
            r.agency_id = $1
            and   r.incident_date >= $2
            and   r.incident_date <= $3
            and   s.deleted is null
          group by s.user_id, s.name
          order by 2 desc
          limit 10`,
        values: [agencyId, startDate.toDate(), endDate.toDate()],
      })
    })
  })

  describe('getMostOftenInvolvedPrisoners', () => {
    test('it should pass on the correct sql', () => {
      const agencyId = 'LEI'
      const startDate = moment()
      const endDate = moment().add(1, 'month')

      reportingClient.getMostOftenInvolvedPrisoners(agencyId, [startDate, endDate])

      expect(query).toBeCalledWith({
        text: `
            select 
              r.offender_no "offenderNo", count(*)
            from 
              v_report r
            where 
              r.agency_id = $1
              and   r.incident_date >= $2
              and   r.incident_date <= $3
            group by offender_no
            order by 2 desc
            limit 10`,
        values: [agencyId, startDate.toDate(), endDate.toDate()],
      })
    })
  })

  describe('getIncidentsOverview', () => {
    test('it should pass on the correct sql', () => {
      const agencyId = 'LEI'
      const startDate = moment('2012-01-02 01:03')
      const endDate = moment(startDate).add(1, 'month')

      reportingClient.getIncidentsOverview(
        agencyId,
        [startDate, endDate],
        [ReportStatus.IN_PROGRESS, ReportStatus.COMPLETE]
      )

      expect(query).toBeCalledWith({
        text: `
          select
            count(*) "total",
            count(*) filter (where (incidentDetails ->> 'plannedUseOfForce')::boolean = true) "planned",
            count(*) filter (where (incidentDetails ->> 'plannedUseOfForce')::boolean = false) "unplanned",
            count(*) filter (where (useOfForceDetails ->> 'handcuffsApplied')::boolean = true) "handcuffsApplied",
            count(*) filter (where (useOfForceDetails ->> 'batonDrawn')::boolean = true) "batonDrawn",
            count(*) filter (where (useOfForceDetails ->> 'batonUsed')::boolean = true) "batonUsed",
            count(*) filter (where (useOfForceDetails ->> 'pavaDrawn')::boolean = true) "pavaDrawn",
            count(*) filter (where (useOfForceDetails ->> 'pavaUsed')::boolean = true) "pavaUsed",
            count(*) filter (where (useOfForceDetails ->> 'personalProtectionTechniques')::boolean = true) "personalProtectionTechniques",
            count(*) filter (where evidence ->> 'cctvRecording' = 'YES') "cctvRecording",
            count(*) filter (where evidence ->> 'bodyWornCamera' = 'YES') "bodyWornCamera",
            count(*) filter (where evidence ->> 'bodyWornCamera' = 'NOT_KNOWN') "bodyWornCameraUnknown"
          from
            (
            select
              form_response  -> 'incidentDetails'   incidentDetails,
              form_response  -> 'useOfForceDetails' useOfForceDetails,
              form_response  -> 'evidence'          evidence
            from
              v_report
            where
              status in ('IN_PROGRESS','COMPLETE')
              and agency_id = 'LEI'
              and incident_date between '2012-01-02 01:03:00.000+00' and '2012-02-02 01:03:00.000+00') incidents`,
      })
    })
  })

  describe('getIncidentLocationsAndTimes', () => {
    test('it should pass on the correct sql', () => {
      const agencyId = 'LEI'
      const startDate = moment()
      const endDate = moment().add(1, 'month')

      reportingClient.getIncidentLocationsAndTimes(agencyId, [startDate, endDate])

      expect(query).toBeCalledWith({
        text: `
          select
            incident_date "incidentDate",
            form_response -> 'incidentDetails' -> 'locationId' "locationId"
          from
            report
          where
            agency_id = $1
            and submitted_date between $2 and $3`,
        values: [agencyId, startDate.toDate(), endDate.toDate()],
      })
    })
  })

  describe('getIncidentCountByOffenderNo', () => {
    test('it should pass on the correct sql', () => {
      const agencyId = 'LEI'
      const startDate = moment()
      const endDate = moment().add(1, 'month')

      reportingClient.getIncidentCountByOffenderNo(agencyId, [startDate, endDate])

      expect(query).toBeCalledWith({
        text: `
        select
          count(*) "incidentCount",
          offender_no "offenderNo"
        from
          v_report
        where
          agency_id = $1
          and incident_date between $2 and $3
        group by
            offender_no`,
        values: [agencyId, startDate.toDate(), endDate.toDate()],
      })
    })
  })
  describe('getIncidentsForAgencyAndDateRange', () => {
    test('it should pass on the correct sql', () => {
      const agencyId = 'WRI'
      const startDate = moment()
      const endDate = moment().add(1, 'month')

      reportingClient.getIncidentsForAgencyAndDateRange(agencyId, [startDate, endDate])

      expect(query).toBeCalledWith({
        text: `
        select
          offender_no "offenderNo",
          incident_date "incidentDate"
        from
          v_report
        where
          agency_id = $1
          and incident_date between $2 and $3`,
        values: [agencyId, startDate.toDate(), endDate.toDate()],
      })
    })
  })
})
