import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { AuthError } from '../../../shared/constants/errors'
import { validateBody } from './utils/validators'
import { verifyUserRfc } from './services/verifyUserRfc'
import { getCachedAnalysis } from './services/getCachedAnalysis'
import { storeAnalysis } from './services/storeAnalysis'
import { invokeCreditHistory } from './services/invokeCreditHistory'
import { creditEngine } from './creditEngine/creditEngine'
import type { AnalysisResponse } from './types/AnalysisResponse'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const DB_SECRET_ID = process.env.DB_SECRET_ID
    if (!DB_SECRET_ID) throw new Error('DB_SECRET_ID is not set')

    const CREDIT_HISTORY_REQUESTS_TABLE_NAME = process.env.CREDIT_HISTORY_REQUESTS_TABLE_NAME
    if (!CREDIT_HISTORY_REQUESTS_TABLE_NAME)
      throw new Error('CREDIT_HISTORY_REQUESTS_TABLE_NAME is not set')

    const GET_CREDIT_HISTORY_FUNCTION_NAME = process.env.GET_CREDIT_HISTORY_FUNCTION_NAME
    if (!GET_CREDIT_HISTORY_FUNCTION_NAME)
      throw new Error('GET_CREDIT_HISTORY_FUNCTION_NAME is not set')

    const authContext = (event.requestContext as unknown as { authorizer?: { lambda?: Record<string, string> } })
      ?.authorizer?.lambda

    if (!authContext?.userId) throw new AuthError('Missing auth context')

    const body = validateBody(event.body ?? '')

    await verifyUserRfc(authContext.userId, body.rfc)

    const cached = await getCachedAnalysis(authContext.userId, CREDIT_HISTORY_REQUESTS_TABLE_NAME)
    if (cached) return createResponsePublic(200, cached)

    const creditHistory = await invokeCreditHistory(body.rfc, GET_CREDIT_HISTORY_FUNCTION_NAME)

    const analyzedAt = new Date().toISOString()
    const result: AnalysisResponse =
      creditHistory.history && creditHistory.activeCredit
        ? { type: 'active_credit', balance: creditHistory.balance, analyzedAt }
        : { type: 'offer', creditOffer: creditEngine(creditHistory), analyzedAt }

    await storeAnalysis(authContext.userId, CREDIT_HISTORY_REQUESTS_TABLE_NAME, result)

    return createResponsePublic(200, result)
  } catch (e) {
    return handleError(e)
  }
}
