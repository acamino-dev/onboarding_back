import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { AuthError } from '../../../shared/constants/errors'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const authContext = (
      event.requestContext as unknown as {
        authorizer?: { lambda?: Record<string, string> }
      }
    )?.authorizer?.lambda

    const email = authContext?.email || process.env.DEV_USER_EMAIL
    if (!email) throw new AuthError('Missing auth context')

    return createResponsePublic(200, { email })
  } catch (e) {
    return handleError(e)
  }
}
