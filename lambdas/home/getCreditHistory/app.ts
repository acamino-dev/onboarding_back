import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { getSecret } from '../../../shared/utils/secrets'
import { loginToPortal, buildConsultaUrl, buildCatPersonaUrl } from './services/portalLogin'
import { searchCreditsByRfc } from './services/searchCreditsByRfc'
import { fetchContractPayments } from './services/fetchContractPayments'
import { fetchEmployeeInfo } from './services/fetchEmployeeInfo'
import { fetchEmploymentData } from './services/fetchEmploymentData'
import { computeAcaminoTenure } from './functions/computeAcaminoTenure'
import { computeCreditFrequency } from './functions/computeCreditFrequency'
import { computeDaysPastDue } from './functions/computeDaysPastDue'
import { computeNextPaymentDate } from './functions/computeNextPaymentDate'
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
  antiguedad: null,
  acaminoTenure: null,
}

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const PORTAL_SECRET_ARN = process.env.PORTAL_SECRET_ARN
    if (!PORTAL_SECRET_ARN) throw new Error('PORTAL_SECRET_ARN is not set')

    const body = JSON.parse(event.body ?? '') as { rfc: string }

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

    const activeBalances = rows
      .filter((row) => row.status === 'ACTIVO')
      .map((row) => {
        const entry = creditHistory.find((e) => e.creditId === row.creditId)
        const lastPayment = entry?.payments.at(-1)?.concept ?? null
        const nextPaymentDate = entry ? computeNextPaymentDate(entry) : null
        return { creditId: row.creditId, balance: row.balance, lastPayment, nextPaymentDate }
      })

    const acaminoTenure = computeAcaminoTenure(rows)

    return createResponsePublic(200, {
      history: true,
      operator: employmentData.puesto.trim().toLowerCase() === 'operador',
      activeCredit: activeBalances.length > 0,
      balance: activeBalances,
      company: employeeInfo.empresa,
      creditHistory,
      frequency: computeCreditFrequency(rows),
      daysPastDue: computeDaysPastDue(creditHistory),
      antiguedad: employmentData.antiguedad,
      acaminoTenure,
    })
  } catch (e) {
    return handleError(e)
  }
}
