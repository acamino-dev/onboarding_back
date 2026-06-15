import { ValidationError } from '../../../../shared/constants/errors'

type ValidatedCredentials = {
  accessToken: string
  refreshToken: string
}

export const validateCredentials = (
  headers: Record<string, string | undefined>,
  cookies: string[] | undefined
): ValidatedCredentials => {
  const authHeader = headers.authorization || headers.Authorization
  if (!authHeader) {
    throw new ValidationError('Missing Authorization header')
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    throw new ValidationError('Invalid Authorization header format, expected: Bearer <token>')
  }

  const accessToken = parts[1]

  const refreshTokenCookie = cookies?.find((c) => c.startsWith('refreshToken='))
  if (!refreshTokenCookie) {
    throw new ValidationError('Missing refreshToken cookie')
  }

  const refreshToken = refreshTokenCookie.slice('refreshToken='.length)
  if (!refreshToken) {
    throw new ValidationError('Empty refreshToken cookie value')
  }

  return { accessToken, refreshToken }
}
