import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createHash } from 'crypto'
import { handleError } from '../../../shared/utils/handleError'
import { deleteRefreshToken } from './services/deleteRefreshToken'
import { findRefreshToken } from './services/findRefreshToken'
import { findUser } from './services/findUser'
import { signAccessToken } from './services/signAccessToken'
import { storeRefreshToken } from './services/storeRefreshToken'
import { generateRefreshToken } from './utils/generateRefreshToken'
import { validateRequest } from './utils/validators'

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

    const { refreshToken } = validateRequest(event.cookies)

    const oldTokenHash = createHash('sha256').update(refreshToken).digest('hex')
    const { user_id: userId } = await findRefreshToken(oldTokenHash, REFRESH_TOKENS_TABLE_NAME)

    const { email, companyId } = await findUser(userId)

    await deleteRefreshToken(oldTokenHash, REFRESH_TOKENS_TABLE_NAME)

    const { rawToken, tokenHash: newTokenHash } = generateRefreshToken()
    await storeRefreshToken(newTokenHash, userId, REFRESH_TOKENS_TABLE_NAME)

    const newAccessToken = await signAccessToken(userId, email, companyId, JWT_SECRET_ARN)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      cookies: [
        `refreshToken=${rawToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`,
      ],
      body: JSON.stringify({ accessToken: newAccessToken }),
    }
  } catch (e) {
    return handleError(e)
  }
}
