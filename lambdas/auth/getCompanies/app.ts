import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { scanCompanies } from './services/scanCompanies'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const COMPANIES_TABLE_NAME = process.env.COMPANIES_TABLE_NAME
    if (!COMPANIES_TABLE_NAME) throw new Error('COMPANIES_TABLE_NAME is not set')

    const companies = await scanCompanies(COMPANIES_TABLE_NAME)

    return createResponsePublic(200, { companies })
  } catch (e) {
    return handleError(e)
  }
}
