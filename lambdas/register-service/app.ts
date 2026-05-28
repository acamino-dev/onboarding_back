import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { ValidationError } from '../../shared/constants/errors'
import { createResponse } from '../../shared/utils/createResponse'
import { handleError } from '../../shared/utils/handleError'
import { getSecret } from '../../shared/utils/secrets'
import { checkUserExists } from './services/checkUserExists'
import { createUser } from './services/createUser'
import { findEmployee } from './services/findEmployee'
import { validateBody } from './utils/validators'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const DB_SECRET_ARN = process.env.DB_SECRET_ARN
    if (!DB_SECRET_ARN) throw new Error('DB_SECRET_ARN is not set')

    const body = validateBody(event.body ?? '')

    const secret = await getSecret(DB_SECRET_ARN)
    const { connectionString } = JSON.parse(secret) as { connectionString: string }

    const employee = await findEmployee(
      body.employee_number,
      body.company_id,
      body.tenant_id,
      connectionString
    )

    if (employee.rfc.toUpperCase() !== body.rfc.toUpperCase()) {
      throw new ValidationError('RFC does not match employee record')
    }

    await checkUserExists(employee.id, connectionString)
    await createUser(employee, body, connectionString)

    return createResponse(201, { message: 'Account created successfully' })
  } catch (e) {
    return handleError(e)
  }
}
