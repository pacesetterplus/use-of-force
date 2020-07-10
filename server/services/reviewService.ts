import R from 'ramda'
import { IncidentClient } from '../data/incidentClient'
import { AgencyId, OffenderService, SystemToken } from '../types/uof'
import { IncidentSearchQuery, IncompleteReportSummary, ReportSummary } from '../data/incidentClientTypes'

export interface IncidentSummary {
  id: number
  bookingId: number
  incidentdate: Date
  staffMemberName: string
  isOverdue: boolean
  offenderName: string
  offenderNo: string
}

interface NamesByOffenderNumber {
  [offenderNo: string]: string
}

const toIncidentSummary = (namesByOffenderNumber: NamesByOffenderNumber) => (
  reportSummary: ReportSummary | IncompleteReportSummary
): IncidentSummary => ({
  id: reportSummary.id,
  bookingId: reportSummary.bookingId,
  incidentdate: reportSummary.incidentDate,
  staffMemberName: reportSummary.reporterName,
  isOverdue: 'isOverdue' in reportSummary ? reportSummary?.isOverdue : false,
  offenderName: namesByOffenderNumber[reportSummary.offenderNo],
  offenderNo: reportSummary.offenderNo,
})

// Surely this is defined somewhere useful? In a base set of typescript types perhaps?
interface Predicate<T> {
  (x: T): boolean
}

const offenderNameFilter = (nameToMatch?: string): Predicate<IncidentSummary> => {
  if (!nameToMatch) return () => true

  const regexp = new RegExp(`^.*${nameToMatch}.*$`, 'i')
  return incidentSummary => regexp.test(incidentSummary.offenderName)
}

const toIncidentSummaries = (namesByOffenderNumber: NamesByOffenderNumber, nameToMatch?: string) => (
  reports: Array<IncompleteReportSummary | ReportSummary>
): Array<IncidentSummary> =>
  reports.map(toIncidentSummary(namesByOffenderNumber)).filter(offenderNameFilter(nameToMatch))

export interface ReportQuery extends IncidentSearchQuery {
  prisonerName?: string
}

export default class ReviewService {
  private readonly statementsClient

  private readonly incidentClient: IncidentClient

  private readonly authClientBuilder

  private readonly offenderService: OffenderService

  private readonly systemToken: SystemToken

  constructor(
    statementsClient,
    incidentClient: IncidentClient,
    authClientBuilder,
    offenderService: OffenderService,
    systemToken: SystemToken
  ) {
    this.statementsClient = statementsClient
    this.incidentClient = incidentClient
    this.authClientBuilder = authClientBuilder
    this.offenderService = offenderService
    this.systemToken = systemToken
  }

  private async statementsWithVerifiedInfo(token: string, statements: any[]): Promise<any[]> {
    const authClient = this.authClientBuilder(token)
    const results = statements.map(statement =>
      authClient.getEmail(statement.userId).then(email => ({ ...statement, isVerified: email.verified }))
    )
    return Promise.all(results)
  }

  async getReport(reportId) {
    const report = await this.incidentClient.getReportForReviewer(reportId)
    if (!report) {
      throw new Error(`Report: '${reportId}' does not exist`)
    }
    return report
  }

  getOffenderNames = async (username, incidents): Promise<NamesByOffenderNumber> => {
    const token = await this.systemToken(username)
    const offenderNos = incidents.map(incident => incident.offenderNo)
    return this.offenderService.getOffenderNames(token, offenderNos)
  }

  async getReports(
    username: string,
    agencyId: AgencyId,
    query: ReportQuery = {}
  ): Promise<{ awaitingReports: IncidentSummary[]; completedReports: IncidentSummary[] }> {
    const awaiting = await this.incidentClient.getIncompleteReportsForReviewer(agencyId, query)
    const completed = await this.incidentClient.getCompletedReportsForReviewer(agencyId, query)

    const namesByOffenderNumber = await this.getOffenderNames(username, [...awaiting, ...completed])

    return R.map(toIncidentSummaries(namesByOffenderNumber, query.prisonerName), {
      awaitingReports: awaiting,
      completedReports: completed,
    })
  }

  async getStatements(token, reportId) {
    const statements = await this.statementsClient.getStatementsForReviewer(reportId)
    return this.statementsWithVerifiedInfo(token, statements)
  }

  async getStatement(statementId) {
    const statement = await this.statementsClient.getStatementForReviewer(statementId)
    if (!statement) {
      throw new Error(`Statement: '${statementId}' does not exist`)
    }
    const additionalComments = await this.statementsClient.getAdditionalComments(statement.id)
    return { additionalComments, ...statement }
  }
}