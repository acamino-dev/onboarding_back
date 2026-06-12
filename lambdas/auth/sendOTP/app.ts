import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { createOtp } from './services/createOtp'
import { findUserByEmail } from './services/findUserByEmail'
import { sendOtpEmail } from './services/sendOtpEmail'
import { validateBody } from './utils/validators'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const DB_SECRET_ID = process.env.DB_SECRET_ID
    if (!DB_SECRET_ID) throw new Error('DB_SECRET_ID is not set')

    const OTP_TABLE_NAME = process.env.OTP_TABLE_NAME
    if (!OTP_TABLE_NAME) throw new Error('OTP_TABLE_NAME is not set')

    const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL
    if (!SES_FROM_EMAIL) throw new Error('SES_FROM_EMAIL is not set')

    const body = validateBody(event.body ?? '')

    await findUserByEmail(body.email)

    const { code } = await createOtp(body.email, OTP_TABLE_NAME)

    await sendOtpEmail(body.email, code, SES_FROM_EMAIL)

    return createResponsePublic(200, { message: 'OTP sent' })
  } catch (e) {
    return handleError(e)
  }
}
