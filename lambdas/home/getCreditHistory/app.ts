import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { fetchCreditHistory } from './services/fetchCreditHistory'
import { validateBody } from './utils/validators'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const PORTAL_SECRET_ARN = process.env.PORTAL_SECRET_ARN
    if (!PORTAL_SECRET_ARN) throw new Error('PORTAL_SECRET_ARN is not set')

    const body = validateBody(event.body ?? '')

    const result = await fetchCreditHistory(body.rfc, PORTAL_SECRET_ARN)

    return createResponsePublic(200, result)
  } catch (e) {
    return handleError(e)
  }
}
