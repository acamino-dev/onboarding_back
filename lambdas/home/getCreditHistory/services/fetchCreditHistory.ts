import { AuthError } from '../../../../shared/constants/errors'
import { getSecret } from '../../../../shared/utils/secrets'
import { loginToPortal, buildConsultaUrl, extractHiddenField } from './portalLogin'
import { fetchContractPayments } from './fetchContractPayments'
import type { CreditHistoryResult } from '../types/CreditHistoryResult'

type PortalSecret = {
  user: string
  password: string
  url: string
}

type ParsedCreditRow = {
  creditId: string
  status: string
  balance: number
  eventTarget: string
}

// Statuses whose payment ledger we drill into. Other statuses still appear in
// the history list but with an empty payments array.
const PAYMENT_STATUSES = new Set(['ACTIVO', 'TERMINADO'])

const EMPTY_RESULT: CreditHistoryResult = {
  history: false,
  operator: null,
  activeCredit: null,
  balance: null,
  credit: null,
  creditHistory: null,
}

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, '').trim()

const extractSpanText = (html: string, idSuffix: string): string => {
  const match = html.match(new RegExp(`id="[^"]*${idSuffix}"[^>]*>([^<]*)<\\/span>`))
  return match?.[1]?.trim() ?? ''
}

const extractInputValue = (html: string, idSuffix: string): string => {
  const match =
    html.match(new RegExp(`id="[^"]*${idSuffix}"[^>]*value="([^"]*)"`)) ??
    html.match(new RegExp(`value="([^"]*)"[^>]*id="[^"]*${idSuffix}"`))
  return match?.[1] ?? ''
}

const parseBalance = (text: string): number => parseFloat(text.replace(/,/g, '')) || 0

// __VIEWSTATE / __VIEWSTATEGENERATOR arrive inside the async-postback delta as
// |<len>|hiddenField|<name>|<value>|. Fall back to a plain hidden input in case
// the search ever returns a full page.
const extractDeltaField = (responseText: string, name: string): string => {
  const match = responseText.match(new RegExp(`\\|hiddenField\\|${name}\\|([^|]*)\\|`))
  return match?.[1] ?? extractHiddenField(responseText, name)
}

const parseCreditTable = (responseText: string): ParsedCreditRow[] => {
  const tableMatch = responseText.match(
    /<table[^>]*id="ctl00_ContentPlaceHolder1_gvData"[^>]*>([\s\S]*?)<\/table>/
  )
  if (!tableMatch) return []

  const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].slice(1)
  const parsed: ParsedCreditRow[] = []

  for (const row of rows) {
    const rowHtml = row[1]
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]))
    if (cells.length < 9) continue

    parsed.push({
      creditId: cells[0],
      status: cells[8],
      balance: parseBalance(extractSpanText(rowHtml, 'lblMonto2')),
      // The link's __doPostBack arg; quotes arrive HTML-encoded (&#39;) in the
      // async-postback delta, plain (') in a full page.
      eventTarget:
        rowHtml.match(/__doPostBack\((?:&#39;|')([^&']*lnkRegistro)(?:&#39;|')/)?.[1] ?? '',
    })
  }

  return parsed
}

export const fetchCreditHistory = async (
  rfc: string,
  portalSecretArn: string
): Promise<CreditHistoryResult> => {
  try {
    const rawSecret = await getSecret(portalSecretArn)
    const { user, password, url } = JSON.parse(rawSecret) as PortalSecret

    const cookie = await loginToPortal(url, user, password)
    const consultaUrl = buildConsultaUrl(url)

    const getResponse = await fetch(consultaUrl, { headers: { Cookie: cookie } })
    if (!getResponse.ok) throw new AuthError('Could not load consulta page')

    const pageHtml = await getResponse.text()
    if (pageHtml.includes('Login1_UserName')) {
      throw new AuthError('Portal login failed: session cookie missing .ASPXAUTH')
    }
    const viewState = extractHiddenField(pageHtml, '__VIEWSTATE')
    const viewStateGenerator = extractHiddenField(pageHtml, '__VIEWSTATEGENERATOR')

    const formBody = new URLSearchParams({
      'ctl00$ScriptManager1': 'ctl00$updFooter|ctl00$ContentPlaceHolder1$cmdBuscar',
      __EVENTTARGET: '',
      __EVENTARGUMENT: '',
      __VIEWSTATE: viewState,
      __VIEWSTATEGENERATOR: viewStateGenerator,
      'ctl00$ContentPlaceHolder1$txtCve': '',
      'ctl00$ContentPlaceHolder1$GpoBusquedaPor': 'rdbRFC',
      'ctl00$ContentPlaceHolder1$txtRFC': rfc,
      'ctl00$ContentPlaceHolder1$txtContrato': '',
      'ctl00$ContentPlaceHolder1$txtNom': '',
      'ctl00$ContentPlaceHolder1$cmbEmpresa': '0',
      'ctl00$ContentPlaceHolder1$cmbEstatus': '0',
      __ASYNCPOST: 'true',
      'ctl00$ContentPlaceHolder1$cmdBuscar': 'Buscar',
    })

    const postResponse = await fetch(consultaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-MicrosoftAjax': 'Delta=true',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: consultaUrl,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Cookie: cookie,
      },
      body: formBody.toString(),
    })

    if (!postResponse.ok) {
      throw new Error(`search failed with status ${postResponse.status}`)
    }

    const searchText = await postResponse.text()
    const rows = parseCreditTable(searchText)
    if (rows.length === 0) return EMPTY_RESULT

    const searchViewState = extractDeltaField(searchText, '__VIEWSTATE')
    const searchViewStateGenerator = extractDeltaField(searchText, '__VIEWSTATEGENERATOR')
    const clientCve = extractInputValue(searchText, '_txtCve')
    const clientNom = extractInputValue(searchText, '_txtNom')

    const firstActive = rows.find((row) => row.status === 'ACTIVO')

    const creditHistory = await Promise.all(
      rows.map(async (row) => {
        if (!PAYMENT_STATUSES.has(row.status) || !row.eventTarget) {
          return { creditId: row.creditId, payments: [] }
        }
        try {
          const payments = await fetchContractPayments({
            searchUrl: consultaUrl,
            cookie,
            viewState: searchViewState,
            viewStateGenerator: searchViewStateGenerator,
            rfc,
            clientCve,
            clientNom,
            eventTarget: row.eventTarget,
          })
          return { creditId: row.creditId, payments }
        } catch {
          // Degrade gracefully: one unreachable contract should not drop the
          // whole history. Leave its ledger empty.
          return { creditId: row.creditId, payments: [] }
        }
      })
    )

    return {
      history: true,
      operator: false,
      activeCredit: Boolean(firstActive),
      balance: firstActive?.balance ?? 0,
      credit: firstActive?.creditId ?? '',
      creditHistory,
    }
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new Error(
      `Error on fetchCreditHistory: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
