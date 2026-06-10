import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponse } from '../../shared/utils/createResponse'
import { handleError } from '../../shared/utils/handleError'
import { checkUserExists } from './services/checkUserExists'
import { createUser } from './services/createUser'
import { findEmployee } from './services/findEmployee'
import { validateBody } from './utils/validators'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const body = validateBody(event.body ?? '')

    const employee = await findEmployee(body.employee_number, body.company_id, body.rfc)

    await checkUserExists(body.email)
    await createUser(employee, body)

    return createResponse(201, { message: 'Account created successfully' })
  } catch (e) {
    return handleError(e)
  }
}
