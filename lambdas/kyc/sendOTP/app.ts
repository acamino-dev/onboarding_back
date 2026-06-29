import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { AuthError } from '../../../shared/constants/errors'
import { validateBody } from './utils/validators'
import { findActiveKycProcess } from './services/findActiveKycProcess'
import { createPhoneOtp } from './services/createPhoneOtp'
import { sendOtpSms } from './services/sendOtpSms'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const KYC_TABLE_NAME = process.env.KYC_TABLE_NAME
    if (!KYC_TABLE_NAME) throw new Error('KYC_TABLE_NAME is not set')

    const OTP_TABLE_NAME = process.env.OTP_TABLE_NAME
    if (!OTP_TABLE_NAME) throw new Error('OTP_TABLE_NAME is not set')

    const authContext = (
      event.requestContext as unknown as { authorizer?: { lambda?: Record<string, string> } }
    )?.authorizer?.lambda

    const userId = authContext?.userId || process.env.DEV_USER_ID
    if (!userId) throw new AuthError('Missing auth context')

    const body = validateBody(event.body ?? '')

    const { creditId } = await findActiveKycProcess(userId, KYC_TABLE_NAME)

    const { code } = await createPhoneOtp(creditId, body.phoneNumber, OTP_TABLE_NAME)

    await sendOtpSms(body.phoneNumber, code)

    return createResponsePublic(200, { message: 'OTP sent' })
  } catch (e) {
    return handleError(e)
  }
}
