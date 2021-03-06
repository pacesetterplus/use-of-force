import page from '../page'

const whatIsStaffMembersNamePage = () =>
  page("What is the staff member's name?", {
    firstName: () => cy.get('#firstName'),
    lastName: () => cy.get('#lastName'),
    clickCancel: () => cy.get('[data-qa="cancel"]').click(),
    clickContinue: () => cy.get('[data-qa="continue"]').click(),
  })

module.exports = { verifyOnPage: whatIsStaffMembersNamePage }
