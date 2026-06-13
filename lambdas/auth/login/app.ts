import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { ForbiddenError } from '../../../shared/constants/errors'
import { handleError } from '../../../shared/utils/handleError'
import { findUserByEmail } from './services/findUserByEmail'
import { signAccessToken } from './services/signAccessToken'
import { storeRefreshToken } from './services/storeRefreshToken'
import { comparePassword } from './utils/comparePassword'
import { generateRefreshToken } from './utils/generateRefreshToken'
import { validateBody } from './utils/validators'

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

    const body = validateBody(event.body ?? '')

    const user = await findUserByEmail(body.email)

    await comparePassword(body.password, user.password_hash)

    if (!user.is_active) {
      throw new ForbiddenError('Account is deactivated', {
        file: 'lambdas/auth/login/app.ts',
        function: 'lambdaHandler',
        operation: 'check employee active status',
      })
    }

    if (!user.otp_verified) {
      throw new ForbiddenError('Email not verified', {
        file: 'lambdas/auth/login/app.ts',
        function: 'lambdaHandler',
        operation: 'check otp verified',
      })
    }

    const { rawToken, tokenHash } = generateRefreshToken()
    await storeRefreshToken(tokenHash, user.id, REFRESH_TOKENS_TABLE_NAME)
    const accessToken = await signAccessToken(user.id, user.email, user.company_id, JWT_SECRET_ARN)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      cookies: [
        `refreshToken=${rawToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`,
      ],
      body: JSON.stringify({ accessToken }),
    }
  } catch (e) {
    return handleError(e)
  }
}
