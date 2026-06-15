import jwt from 'jsonwebtoken'
import { AuthError } from '../../../../shared/constants/errors'
import { getSecret } from '../../../../shared/utils/secrets'

type JwtSecret = {
  secret: string
}

type DecodedToken = {
  userId: string
  email: string
  companyId: string
}

export const decodeExpiredToken = async (
  token: string,
  jwtSecretArn: string
): Promise<DecodedToken> => {
  try {
    const secretString = await getSecret(jwtSecretArn)
    const { secret } = JSON.parse(secretString) as JwtSecret

    const decoded = jwt.verify(token, secret, { ignoreExpiration: true }) as jwt.JwtPayload

    return {
      userId: decoded.sub as string,
      email: decoded.email as string,
      companyId: decoded.companyId as string,
    }
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthError('Invalid access token signature', {
        file: 'lambdas/auth/renewToken/services/decodeExpiredToken.ts',
        function: 'decodeExpiredToken',
        operation: 'verify JWT signature ignoring expiration',
      })
    }
    throw new Error(`Error on decodeExpiredToken: ${error instanceof Error ? error.message : String(error)}`)
  }
}
