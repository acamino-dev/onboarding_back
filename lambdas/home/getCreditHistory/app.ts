import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { getSecret } from '../../../shared/utils/secrets'
import { loginToPortal, buildConsultaUrl, buildCatPersonaUrl } from './services/portalLogin'
import { searchCreditsByRfc } from './services/searchCreditsByRfc'
import { fetchContractPayments } from './services/fetchContractPayments'
import { fetchEmployeeInfo } from './services/fetchEmployeeInfo'
import { fetchEmploymentData } from './services/fetchEmploymentData'
import { computeCreditFrequency } from './services/functions/computeCreditFrequency'
import { computeDaysPastDue } from './services/functions/computeDaysPastDue'
import { validateBody } from './utils/validators'
import type { CreditHistoryResult } from './types/CreditHistoryResult'
import type { PortalSecret } from './types/PortalSecret'

const EMPTY_RESULT: CreditHistoryResult = {
  history: false,
  operator: null,
  activeCredit: null,
  balance: null,
  company: null,
  creditHistory: null,
  frequency: null,
  daysPastDue: null,
}

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const PORTAL_SECRET_ARN = process.env.PORTAL_SECRET_ARN
    if (!PORTAL_SECRET_ARN) throw new Error('PORTAL_SECRET_ARN is not set')

    const body = validateBody(event.body ?? '')

    const rawSecret = await getSecret(PORTAL_SECRET_ARN)
    const { user, password, url } = JSON.parse(rawSecret) as PortalSecret

    const cookie = await loginToPortal(url, user, password)
    const consultaUrl = buildConsultaUrl(url)
    const catPersonaUrl = buildCatPersonaUrl(url)

    const [employeeInfo, searchResult] = await Promise.all([
      fetchEmployeeInfo(catPersonaUrl, cookie, body.rfc),
      searchCreditsByRfc(consultaUrl, cookie, body.rfc),
    ])

    if (!employeeInfo || searchResult.rows.length === 0) return createResponsePublic(200, EMPTY_RESULT)

    const { rows, viewState, viewStateGenerator, clientCve, clientNom } = searchResult
    const firstActive = rows.find((row) => row.status === 'ACTIVO')

    const [employmentData, creditHistory] = await Promise.all([
      fetchEmploymentData(employeeInfo.mtoPersonaUrl, cookie),
      fetchContractPayments(rows, {
        searchUrl: consultaUrl,
        cookie,
        viewState,
        viewStateGenerator,
        rfc: body.rfc,
        clientCve,
        clientNom,
      }),
    ])

    return createResponsePublic(200, {
      history: true,
      operator: employmentData.puesto.trim().toLowerCase() === 'operador',
      activeCredit: Boolean(firstActive),
      balance: firstActive?.balance ?? 0,
      company: employeeInfo.empresa,
      creditHistory,
      frequency: computeCreditFrequency(rows),
      daysPastDue: computeDaysPastDue(creditHistory),
    })
  } catch (e) {
    return handleError(e)
  }
}
