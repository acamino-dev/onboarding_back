import type { APIGatewayRequestAuthorizerEventV2 } from 'aws-lambda'
import { createHash } from 'crypto'
import { findRefreshToken } from './services/findRefreshToken'
import { verifyAccessToken } from './services/verifyAccessToken'
import { extractTokens } from './utils/extractTokens'

type AuthorizerResult = {
  isAuthorized: boolean
  context?: {
    userId: string
    email: string
    companyId: string
  }
}

export const lambdaHandler = async (
  event: APIGatewayRequestAuthorizerEventV2
): Promise<AuthorizerResult> => {
  try {
    const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN
    if (!JWT_SECRET_ARN) return { isAuthorized: false }

    const REFRESH_TOKENS_TABLE_NAME = process.env.REFRESH_TOKENS_TABLE_NAME
    if (!REFRESH_TOKENS_TABLE_NAME) return { isAuthorized: false }

    const { accessToken, refreshToken } = extractTokens(event.headers ?? {}, event.cookies)

    const { userId, email, companyId } = await verifyAccessToken(accessToken, JWT_SECRET_ARN)

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
    const tokenData = await findRefreshToken(tokenHash, REFRESH_TOKENS_TABLE_NAME)

    if (tokenData.user_id !== userId) {
      return { isAuthorized: false }
    }

    return {
      isAuthorized: true,
      context: { userId, email, companyId },
    }
  } catch {
    return { isAuthorized: false }
  }
}
