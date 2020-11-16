import { NextFunction, Request, Response } from 'express'

import jwtDecode from 'jwt-decode'

const COORDINATOR = 'ROLE_USE_OF_FORCE_COORDINATOR'
const REVIEWER = 'ROLE_USE_OF_FORCE_REVIEWER'

type Token = { authorities?: string[] }

export default (req: Request, res: Response, next: NextFunction): void => {
  if (res.locals && res.locals.user && res.locals.user.token) {
    const { authorities: roles = [] } = jwtDecode(res.locals.user.token) as Token

    const isAnyOf = options => options.some(role => roles.includes(role))

    res.locals.user = {
      isReviewer: isAnyOf([REVIEWER, COORDINATOR]),
      isCoordinator: isAnyOf([COORDINATOR]),
      ...res.locals.user,
    }
    return next()
  }
  req.session.returnTo = req.originalUrl
  return res.redirect('/login')
}
