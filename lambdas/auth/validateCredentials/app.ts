import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createHash } from 'crypto'
import { AuthError } from '../../../shared/constants/errors'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { findRefreshToken } from './services/findRefreshToken'
import { verifyAccessToken } from './services/verifyAccessToken'
import { validateCredentials } from './utils/validators'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const DB_SECRET_ID = process.env.DB_SECRET_ID
    if (!DB_SECRET_ID) throw new Error('DB_SECRET_ID is not set')

    const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN
    if (!JWT_SECRET_ARN) throw new Error('JWT_SECRET_ARN is not set')

    const REFRESH_TOKENS_TABLE_NAME = process.env.REFRESH_TOKENS_TABLE_NAME
    if (!REFRESH_TOKENS_TABLE_NAME) throw new Error('REFRESH_TOKENS_TABLE_NAME is not set')

    const { accessToken, refreshToken } = validateCredentials(
      event.headers ?? {},
      event.cookies
    )

    const { userId, email } = await verifyAccessToken(accessToken, JWT_SECRET_ARN)

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
    const tokenData = await findRefreshToken(tokenHash, REFRESH_TOKENS_TABLE_NAME)

    if (tokenData.user_id !== userId) {
      throw new AuthError('Token mismatch', {
        file: 'lambdas/auth/validateCredentials/app.ts',
        function: 'lambdaHandler',
        operation: 'cross-token binding check',
      })
    }

    return createResponsePublic(200, { email })
  } catch (e) {
    return handleError(e)
  }
}
