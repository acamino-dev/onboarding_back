type ExtractedTokens = {
  accessToken: string
  refreshToken: string
}

export const extractTokens = (
  headers: Record<string, string | undefined>,
  cookies: string[] | undefined
): ExtractedTokens => {
  const authHeader = headers.authorization || headers.Authorization
  if (!authHeader) throw new Error('Missing Authorization header')

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    throw new Error('Invalid Authorization header format')
  }

  const accessToken = parts[1]

  const refreshTokenCookie = cookies?.find((c) => c.startsWith('refreshToken='))
  if (!refreshTokenCookie) throw new Error('Missing refreshToken cookie')

  const refreshToken = refreshTokenCookie.slice('refreshToken='.length)
  if (!refreshToken) throw new Error('Empty refreshToken cookie value')

  return { accessToken, refreshToken }
}
