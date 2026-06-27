import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { AuthError, ForbiddenError } from '../../../shared/constants/errors'
import { validateBody } from './utils/validators'
import { getCreditOffer } from './services/getCreditOffer'
import { createKycProcess } from './services/createKycProcess'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const CREDIT_HISTORY_REQUESTS_TABLE_NAME = process.env.CREDIT_HISTORY_REQUESTS_TABLE_NAME
    if (!CREDIT_HISTORY_REQUESTS_TABLE_NAME)
      throw new Error('CREDIT_HISTORY_REQUESTS_TABLE_NAME is not set')

    const KYC_TABLE_NAME = process.env.KYC_TABLE_NAME
    if (!KYC_TABLE_NAME) throw new Error('KYC_TABLE_NAME is not set')

    const authContext = (
      event.requestContext as unknown as { authorizer?: { lambda?: Record<string, string> } }
    )?.authorizer?.lambda

    const userId = authContext?.userId || process.env.DEV_USER_ID
    if (!userId) throw new AuthError('Missing auth context')

    const { monto, plazo } = validateBody(event.body ?? '')

    const creditOffer = await getCreditOffer(userId, CREDIT_HISTORY_REQUESTS_TABLE_NAME)

    if (monto > creditOffer.amount) {
      throw new ForbiddenError('Requested amount exceeds approved credit limit', {
        file: 'lambdas/kyc/creditConditions/app.ts',
        function: 'lambdaHandler',
        monto,
        approvedAmount: creditOffer.amount,
      })
    }

    if (plazo > creditOffer.plazo) {
      throw new ForbiddenError('Requested term exceeds approved credit term', {
        file: 'lambdas/kyc/creditConditions/app.ts',
        function: 'lambdaHandler',
        plazo,
        approvedPlazo: creditOffer.plazo,
      })
    }

    const kycProcess = await createKycProcess(userId, monto, plazo, KYC_TABLE_NAME)

    return createResponsePublic(200, kycProcess)
  } catch (e) {
    return handleError(e)
  }
}
