const format = require('pg-format')
const db = require('../../server/data/dataAccess/db')
const incidentClient = require('../../server/data/incidentClient')

const getCurrentDraft = bookingId =>
  incidentClient.getCurrentDraftReport('Test User', bookingId, db.queryWithoutTransaction)

const getStatementForUser = ({ reportId, status }) =>
  incidentClient.getStatement('Test User', reportId, status, db.queryWithoutTransaction)

const getAllStatementsForReport = reportId => {
  return db
    .queryWithoutTransaction({
      text: `select s."name", s.email, s.user_id userId, statement_status status from statement s where s.report_id = $1`,
      values: [reportId],
    })
    .then(result => result.rows || [])
}
module.exports = {
  clearDb() {
    const drops = ['report', 'statement'].map(table =>
      db.queryWithoutTransaction({
        text: format('delete from %I', table),
      })
    )
    return Promise.all(drops)
  },

  getCurrentDraft({ bookingId, formName }) {
    return getCurrentDraft(bookingId).then(form => ({
      id: form.id,
      incidentDate: form.incident_date,
      payload: { ...form.form_response.incident[formName] },
    }))
  },

  getStatementForUser,
  getAllStatementsForReport,
}
