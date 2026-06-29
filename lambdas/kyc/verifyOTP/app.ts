import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { AuthError, ForbiddenError } from '../../../shared/constants/errors'
import { KYC_STEPS } from '../../../shared/constants/kyc'
import { validateBody } from './utils/validators'
import { getKycByUserId } from './services/getKycByUserId'
import { verifyAndDeleteOtp } from './services/verifyAndDeleteOtp'
import { advanceKycToReview } from './services/advanceKycToReview'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const DB_SECRET_ID = process.env.DB_SECRET_ID
    if (!DB_SECRET_ID) throw new Error('DB_SECRET_ID is not set')

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

    const kycRecord = await getKycByUserId(userId, KYC_TABLE_NAME)

    if (kycRecord.step !== KYC_STEPS.OTP) {
      throw new ForbiddenError(`Invalid step for OTP verification: ${kycRecord.step}`)
    }

    await verifyAndDeleteOtp(kycRecord.creditId, body.code, OTP_TABLE_NAME)

    await advanceKycToReview(kycRecord.creditId, KYC_TABLE_NAME)

    return createResponsePublic(200, { message: 'OTP verified' })
  } catch (e) {
    return handleError(e)
  }
}
