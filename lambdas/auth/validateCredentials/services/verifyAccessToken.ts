import jwt from 'jsonwebtoken'
import { AuthError, TokenExpiredError } from '../../../../shared/constants/errors'
import { getSecret } from '../../../../shared/utils/secrets'

type JwtSecret = {
  secret: string
}

type DecodedToken = {
  userId: string
  email: string
  companyId: string
}

export const verifyAccessToken = async (
  token: string,
  jwtSecretArn: string
): Promise<DecodedToken> => {
  try {
    const secretString = await getSecret(jwtSecretArn)
    const { secret } = JSON.parse(secretString) as JwtSecret

    const decoded = jwt.verify(token, secret) as jwt.JwtPayload

    return {
      userId: decoded.sub as string,
      email: decoded.email as string,
      companyId: decoded.companyId as string,
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError('Access token expired', {
        file: 'lambdas/auth/validateCredentials/services/verifyAccessToken.ts',
        function: 'verifyAccessToken',
        operation: 'verify JWT',
      })
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthError('Invalid access token', {
        file: 'lambdas/auth/validateCredentials/services/verifyAccessToken.ts',
        function: 'verifyAccessToken',
        operation: 'verify JWT',
      })
    }
    throw new Error(`Error on verifyAccessToken: ${error instanceof Error ? error.message : String(error)}`)
  }
}
