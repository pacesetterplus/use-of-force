const moment = require('moment')
const AllIncidentsPage = require('../../pages/reviewer/allIncidentsPage')
const ViewReportPage = require('../../pages/reviewer/viewReportPage')
const ViewStatementsPage = require('../../pages/reviewer/viewStatementsPage')

const { ReportStatus } = require('../../../server/config/types')

context('view review page', () => {
  const bookingId = 1001
  beforeEach(() => {
    cy.task('reset')
    cy.task('stubOffenderDetails', bookingId)
    cy.task('stubLocations', 'MDI')
    cy.task('stubOffenders')
    cy.task('stubLocation', '357591')
    cy.task('stubUserDetailsRetrieval', 'MR_ZAGATO')
    cy.task('stubUserDetailsRetrieval', 'MRS_JONES')
    cy.task('stubUserDetailsRetrieval', 'TEST_USER')
  })

  it('A reviewer can view reports they did and did not raise', () => {
    cy.task('stubReviewerLogin')
    cy.login(bookingId)

    cy.task('seedReport', {
      status: ReportStatus.SUBMITTED,
      submittedDate: moment().toDate(),
      userId: 'TEST_USER',
      reporterName: 'James Stuart',
      agencyId: 'MDI',
      bookingId,
      involvedStaff: [
        {
          userId: 'TEST_USER',
          name: 'TEST_USER name',
          email: 'TEST_USER@gov.uk',
        },
      ],
    })

    cy.task('seedReport', {
      status: ReportStatus.SUBMITTED,
      submittedDate: moment().toDate(),
      userId: 'ANOTHER_USER',
      reporterName: 'Anne OtherUser',
      agencyId: 'MDI',
      bookingId,
      involvedStaff: [
        {
          userId: 'ANOTHER_USER',
          name: 'Another user name',
          email: 'TEST_USER@gov.uk',
        },
      ],
    })

    const allIncidentsPage = AllIncidentsPage.goTo()
    allIncidentsPage.getTodoRows().should('have.length', 2)
    allIncidentsPage.getNoCompleteRows().should('exist')

    allIncidentsPage.selectedTab().contains('All incidents')

    {
      const { prisoner, reporter, viewStatementsButton } = allIncidentsPage.getTodoRow(0)
      prisoner().contains('Smith, Norman')
      reporter().contains('James Stuart')
      viewStatementsButton().click()

      const viewStatementsPage = ViewStatementsPage.verifyOnPage()
      viewStatementsPage.reportLink().click()

      const viewReportPage = ViewReportPage.verifyOnPage()
      viewReportPage.reporterName().contains('James Stuart')
      viewReportPage.verifyInputs({ involvedStaff: ['Test_user Name - TEST_USER'] })
      viewReportPage.getReportId().then(reportId => {
        viewReportPage.incidentNumber().contains(reportId)
      })

      viewReportPage.continue().click()
    }

    {
      const { prisoner, reporter, prisonNumber, viewStatementsButton } = allIncidentsPage.getTodoRow(1)
      prisoner().contains('Smith, Norman')
      reporter().contains('Anne OtherUser')
      prisonNumber().contains('A1234AC')
      viewStatementsButton().click()

      const viewStatementsPage = ViewStatementsPage.verifyOnPage()
      viewStatementsPage.reportLink().click()

      const viewReportPage = ViewReportPage.verifyOnPage()
      viewReportPage.reporterName().contains('Anne OtherUser')
      viewReportPage.verifyInputs({ involvedStaff: ['Another User Name - ANOTHER_USER'] })
      viewReportPage.continue().click()
    }
  })
})
