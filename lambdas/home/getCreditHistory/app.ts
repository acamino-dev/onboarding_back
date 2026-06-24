import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponsePublic } from '../../../shared/utils/createResponse'
import { handleError } from '../../../shared/utils/handleError'
import { getSecret } from '../../../shared/utils/secrets'
import { loginToPortal, buildConsultaUrl } from './services/portalLogin'
import { searchCreditsByRfc } from './services/searchCreditsByRfc'
import { fetchContractPayments } from './services/fetchContractPayments'
import { validateBody } from './utils/validators'
import type { CreditHistoryResult } from './types/CreditHistoryResult'

type PortalSecret = {
  user: string
  password: string
  url: string
}

const EMPTY_RESULT: CreditHistoryResult = {
  history: false,
  operator: null,
  activeCredit: null,
  balance: null,
  credit: null,
  creditHistory: null,
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

    const { rows, viewState, viewStateGenerator, clientCve, clientNom } =
      await searchCreditsByRfc(consultaUrl, cookie, body.rfc)

    if (rows.length === 0) return createResponsePublic(200, EMPTY_RESULT)

    const firstActive = rows.find((row) => row.status === 'ACTIVO')

    const creditHistory = await fetchContractPayments(rows, {
      searchUrl: consultaUrl,
      cookie,
      viewState,
      viewStateGenerator,
      rfc: body.rfc,
      clientCve,
      clientNom,
    })

    return createResponsePublic(200, {
      history: true,
      operator: false,
      activeCredit: Boolean(firstActive),
      balance: firstActive?.balance ?? 0,
      credit: firstActive?.creditId ?? '',
      creditHistory,
    })
  } catch (e) {
    return handleError(e)
  }
}
