import { AuthError } from '../../../../shared/constants/errors'
import { getSecret } from '../../../../shared/utils/secrets'
import { loginToPortal, buildConsultaUrl, extractHiddenField } from './portalLogin'
import type { CreditHistoryResult, CreditEntry } from '../types/CreditHistoryResult'

type PortalSecret = {
  user: string
  password: string
  url: string
}

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, '').trim()

const extractSpanText = (html: string, idSuffix: string): string => {
  const match = html.match(new RegExp(`id="[^"]*${idSuffix}"[^>]*>([^<]*)<\\/span>`))
  return match?.[1]?.trim() ?? ''
}

const parseBalance = (text: string): number => parseFloat(text.replace(/,/g, '')) || 0

const parseCreditTable = (responseText: string): CreditHistoryResult => {
  const tableMatch = responseText.match(
    /<table[^>]*id="ctl00_ContentPlaceHolder1_gvData"[^>]*>([\s\S]*?)<\/table>/
  )
  if (!tableMatch) {
    return { history: false, operator: null, activeCredit: null, balance: null, credit: null, creditHistory: null }
  }

  const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].slice(1)
  if (rows.length === 0) {
    return { history: false, operator: null, activeCredit: null, balance: null, credit: null, creditHistory: null }
  }

  const creditHistory: CreditEntry[] = []
  let activeCredit = false
  let balance = 0
  let credit = ''

  for (const row of rows) {
    const rowHtml = row[1]
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]))
    if (cells.length < 9) continue

    const creditId = cells[0]
    const status = cells[8]

    if (status === 'ACTIVO' && !activeCredit) {
      activeCredit = true
      balance = parseBalance(extractSpanText(rowHtml, 'lblMonto2'))
      credit = creditId
    }

    creditHistory.push({
      creditId,
      payments: [
        {
          operationDate: extractSpanText(rowHtml, 'lblFecIni'),
          dueDate: extractSpanText(rowHtml, 'lblFecFin'),
        },
      ],
    })
  }

  return { history: true, operator: false, activeCredit, balance, credit, creditHistory }
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

    return parseCreditTable(await postResponse.text())
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new Error(
      `Error on fetchCreditHistory: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
