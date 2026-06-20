import { ValidationError } from '../../../../shared/constants/errors'

type ValidatedRequest = {
  refreshToken: string
}

export const validateRequest = (cookies: string[] | undefined): ValidatedRequest => {
  const refreshTokenCookie = cookies?.find((c) => c.startsWith('refreshToken='))
  if (!refreshTokenCookie) {
    throw new ValidationError('Missing refreshToken cookie')
  }

  const refreshToken = refreshTokenCookie.slice('refreshToken='.length)
  if (!refreshToken) {
    throw new ValidationError('Empty refreshToken cookie value')
  }

  return { refreshToken }
}
