import moment, { Moment } from 'moment'
import logger from '../../log'
import { ReportStatus } from '../config/types'
import IncidentClient from '../data/incidentClient'
import StatementsClient from '../data/statementsClient'
import { User, GetUsersResults } from '../types/uof'
import { InTransaction, QueryPerformer } from '../data/dataAccess/db'
import UserService from './userService'

export enum AddStaffResult {
  SUCCESS = 'success',
  SUCCESS_UNVERIFIED = 'unverified',
  MISSING = 'missing',
  ALREADY_EXISTS = 'already-exists',
}

export class InvolvedStaffService {
  constructor(
    private readonly incidentClient: IncidentClient,
    private readonly statementsClient: StatementsClient,
    private readonly userService: UserService,
    private readonly inTransaction: InTransaction,
    private readonly queryPerformer: QueryPerformer
  ) {}

  public getInvolvedStaff(reportId: number): Promise<any[]> {
    return this.incidentClient.getInvolvedStaff(reportId)
  }

  public getDraftInvolvedStaff(reportId: number): Promise<any[]> {
    return this.incidentClient.getDraftInvolvedStaff(reportId)
  }

  public removeMissingDraftInvolvedStaff = async (userId: string, bookingId: number) => {
    const { id, form = {} } = await this.incidentClient.getCurrentDraftReport(userId, bookingId)

    const { incidentDetails = {} } = form
    const { involvedStaff = [] } = incidentDetails
    const updatedInvolvedStaff = involvedStaff.filter(staff => !staff.missing)

    const updatedFormObject = {
      ...form,
      incidentDetails: { ...incidentDetails, involvedStaff: updatedInvolvedStaff },
    }
    await this.incidentClient.updateDraftReport(id, null, updatedFormObject)
  }

  public loadInvolvedStaff = async (reportId: number, statementId: number) => {
    const involvedStaff = await this.incidentClient.getInvolvedStaff(reportId)
    const found = involvedStaff.find(staff => staff.statementId === statementId)
    if (!found) {
      throw new Error(`Staff with id: ${statementId}, does not exist on report: '${reportId}'`)
    }
    return found
  }

  public loadInvolvedStaffByUsername = async (reportId: number, username: string) => {
    const involvedStaff = await this.incidentClient.getInvolvedStaff(reportId)
    const found = involvedStaff.find(staff => staff.userId === username)
    if (!found) {
      throw new Error(`Staff with username: ${username}, does not exist on report: '${reportId}'`)
    }
    return found
  }

  public async lookup(token: string, usernames: string[]): Promise<GetUsersResults[]> {
    return this.userService.getUsers(token, usernames)
  }

  private getStaffRequiringStatements = async (currentUser, addedStaff) => {
    const userAlreadyAdded = addedStaff.find(user => currentUser.username === user.username)
    if (userAlreadyAdded) {
      return addedStaff
    }
    // Current user hasn't added themselves, so add them to the list.
    const [foundUser] = await this.userService.getUsers(currentUser.token, [currentUser.username])

    if (!foundUser || foundUser.missing) {
      throw new Error(`Could not retrieve user details for current user: '${currentUser.username}'`)
    }

    logger.info('Found user:', foundUser)
    return [...addedStaff, foundUser]
  }

  public async save(
    reportId: number,
    reportSubmittedDate: Moment,
    overdueDate: Moment,
    currentUser: User,
    client: QueryPerformer
  ) {
    const involvedStaff = await this.getDraftInvolvedStaff(reportId)

    const staffToCreateStatmentsFor = await this.getStaffRequiringStatements(currentUser, involvedStaff)

    const staff = staffToCreateStatmentsFor.map(user => ({
      staffId: user.staffId,
      userId: user.username,
      name: user.name,
      email: user.email,
    }))

    const firstReminderDate = moment(reportSubmittedDate).add(1, 'day')
    const userIdsToStatementIds = await this.statementsClient.createStatements({
      reportId,
      firstReminder: firstReminderDate.toDate(),
      overdueDate: overdueDate.toDate(),
      staff,
      query: this.queryPerformer,
    })
    return staff.map(staffMember => ({ ...staffMember, statementId: userIdsToStatementIds[staffMember.userId] }))
  }

  addInvolvedStaff = async (token, reportId, username) => {
    logger.info(`Adding involved staff with username: ${username} to report: '${reportId}'`)

    const [foundUser] = await this.userService.getUsers(token, [username])

    if (!foundUser || foundUser.missing) {
      return AddStaffResult.MISSING
    }

    logger.info(`found staff: '${foundUser}'`)

    const report = await this.incidentClient.getReportForReviewer(reportId)
    if (!report) {
      throw new Error(`Report: '${reportId}' does not exist`)
    }

    if (await this.statementsClient.isStatementPresentForUser(reportId, username)) {
      return AddStaffResult.ALREADY_EXISTS
    }

    return this.inTransaction(async client => {
      await this.statementsClient.createStatements({
        reportId,
        firstReminder: null,
        overdueDate: moment(report.submittedDate).add(3, 'day').toDate(),
        staff: [
          {
            staffId: foundUser.staffId,
            userId: foundUser.username,
            name: foundUser.name,
            email: foundUser.email,
          },
        ],
        query: this.queryPerformer,
      })

      if (report.status === ReportStatus.COMPLETE.value) {
        logger.info(`There are now pending statements on : ${reportId}, moving from 'COMPLETE' to 'SUBMITTED'`)
        await this.incidentClient.changeStatus(reportId, ReportStatus.COMPLETE, ReportStatus.SUBMITTED, client)
      }
      return foundUser.verified ? AddStaffResult.SUCCESS : AddStaffResult.SUCCESS_UNVERIFIED
    })
  }

  public removeInvolvedStaff = async (reportId, statementId) => {
    logger.info(`Removing statement: ${statementId} from report: ${reportId}`)

    await this.inTransaction(async client => {
      const pendingStatementBeforeDeletion = await this.statementsClient.getNumberOfPendingStatements(reportId, client)

      await this.statementsClient.deleteStatement({
        statementId,
        query: client,
      })

      if (pendingStatementBeforeDeletion !== 0) {
        const pendingStatementCount = await this.statementsClient.getNumberOfPendingStatements(reportId, client)

        if (pendingStatementCount === 0) {
          logger.info(`All statements complete on : ${reportId}, marking as complete`)
          await this.incidentClient.changeStatus(reportId, ReportStatus.SUBMITTED, ReportStatus.COMPLETE, client)
        }
      }
    })
  }
}