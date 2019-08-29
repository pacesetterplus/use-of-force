module.exports = function TasklistRoutes({ reportService, offenderService }) {
  return {
    view: async (req, res) => {
      const { bookingId } = req.params
      const { displayName, offenderNo, dateOfBirth } = await offenderService.getOffenderDetails(
        res.locals.user.token,
        bookingId
      )
      const { form_response: form = {} } = await reportService.getCurrentDraft(req.user.username, bookingId)
      res.render('pages/report-use-of-force', {
        data: { ...res.locals.formObject, displayName, offenderNo, dateOfBirth },
        bookingId: req.params.bookingId,
        form,
      })
    },
  }
}