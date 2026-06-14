import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { validateBody } from './utils/validators'
import { findVerifiedUserByEmail } from './services/findVerifiedUserByEmail'
import { findOtp } from './services/findOtp'
import { deleteOtpsByEmail } from './services/deleteOtpsByEmail'
import { updateUserPassword } from './services/updateUserPassword'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const DB_SECRET_ID = process.env.DB_SECRET_ID
    if (!DB_SECRET_ID) throw new Error('DB_SECRET_ID is not set')

    const OTP_TABLE_NAME = process.env.OTP_TABLE_NAME
    if (!OTP_TABLE_NAME) throw new Error('OTP_TABLE_NAME is not set')

    const body = validateBody(event.body ?? '')

    await findVerifiedUserByEmail(body.email)
    await findOtp(body.email, body.code, OTP_TABLE_NAME)
    await deleteOtpsByEmail(body.email, OTP_TABLE_NAME)
    await updateUserPassword(body.email, body.password)

    return createResponsePublic(200, { message: 'Password reset successfully' })
  } catch (e) {
    return handleError(e)
  }
}
