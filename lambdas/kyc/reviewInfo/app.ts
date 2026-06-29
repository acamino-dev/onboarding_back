import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { AuthError, ForbiddenError } from '../../../shared/constants/errors'
import { KYC_STEPS } from '../../../shared/constants/kyc'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { getKycByUserId } from './services/getKycByUserId'
import { saveKycReviewInfo } from './services/saveKycReviewInfo'
import { validateBody } from './utils/validators'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const KYC_TABLE_NAME = process.env.KYC_TABLE_NAME
    if (!KYC_TABLE_NAME) throw new Error('KYC_TABLE_NAME is not set')

    const authContext = (
      event.requestContext as unknown as { authorizer?: { lambda?: Record<string, string> } }
    )?.authorizer?.lambda

    const userId = authContext?.userId ?? process.env.DEV_USER_ID
    if (!userId) throw new AuthError('Missing auth context')

    const body = validateBody(event.body ?? '')

    const kycRecord = await getKycByUserId(userId, KYC_TABLE_NAME)

    if (kycRecord.step !== KYC_STEPS.REVIEW) {
      throw new ForbiddenError(`Invalid step for review info: ${kycRecord.step}`)
    }

    await saveKycReviewInfo(kycRecord.creditId, body, KYC_TABLE_NAME)

    return createResponsePublic(200, { errorCode: 701 })
  } catch (e) {
    return handleError(e)
  }
}
