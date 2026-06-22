import { extractHiddenField } from './portalLogin'
import type { Payment } from '../types/CreditHistoryResult'

type FetchContractPaymentsArgs = {
  searchUrl: string
  cookie: string
  viewState: string
  viewStateGenerator: string
  rfc: string
  // The RFC search pre-fills these on the search page; the server reads them to
  // build CvePersona/NomPer in the redirect. Empty values yield empty payments.
  clientCve: string
  clientNom: string
  eventTarget: string
}

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim()

const getInputValue = (html: string, idSuffix: string): string => {
  const match =
    html.match(new RegExp(`id="[^"]*${idSuffix}"[^>]*value="([^"]*)"`)) ??
    html.match(new RegExp(`value="([^"]*)"[^>]*id="[^"]*${idSuffix}"`))
  return match?.[1] ?? ''
}

const getCheckedRadioValue = (html: string, nameSuffix: string): string => {
  const match = html.match(new RegExp(`name="[^"]*${nameSuffix}"[^>]*value="([^"]*)"[^>]*checked`))
  return match?.[1] ?? ''
}

// Replay the gvData row __doPostBack against the search page. The server-side
// click handler issues a Response.Redirect to su_ConsultaFinanciera.aspx with
// the contract's nav params (CveContPro/CvePersona/NomPer/PJuridica/CveEmpresa/
// NomEmpresa). We capture that target instead of following it.
const resolveDetailUrl = async (args: FetchContractPaymentsArgs): Promise<string> => {
  const body = new URLSearchParams({
    __EVENTTARGET: args.eventTarget,
    __EVENTARGUMENT: '',
    __VIEWSTATE: args.viewState,
    __VIEWSTATEGENERATOR: args.viewStateGenerator,
    'ctl00$ContentPlaceHolder1$txtCve': args.clientCve,
    'ctl00$ContentPlaceHolder1$GpoBusquedaPor': 'rdbRFC',
    'ctl00$ContentPlaceHolder1$txtRFC': args.rfc,
    'ctl00$ContentPlaceHolder1$txtContrato': '',
    'ctl00$ContentPlaceHolder1$txtNom': args.clientNom,
    'ctl00$ContentPlaceHolder1$cmbEmpresa': '0',
    'ctl00$ContentPlaceHolder1$cmbEstatus': '0',
  })

  const response = await fetch(args.searchUrl, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Referer: args.searchUrl,
      'User-Agent': USER_AGENT,
      Cookie: args.cookie,
    },
    body: body.toString(),
  })

  let location = response.headers.get('location')
  if (!location) {
    // Async postback path: redirect arrives as a |pageRedirect||url| delta segment
    const text = await response.text()
    location = text.match(/\|pageRedirect\|\|([^|]*)\|/)?.[1] ?? null
  }
  if (!location) throw new Error('could not resolve contract detail url from postback')

  return new URL(location, args.searchUrl).toString()
}

const loadDetailDefaults = async (
  detailUrl: string,
  cookie: string
): Promise<{ viewState: string; viewStateGenerator: string; body: URLSearchParams }> => {
  const response = await fetch(detailUrl, { headers: { Cookie: cookie, 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`detail page failed with status ${response.status}`)

  const html = await response.text()
  if (html.includes('Login1_UserName')) {
    throw new Error('session expired loading contract detail page')
  }

  const viewState = extractHiddenField(html, '__VIEWSTATE')
  const viewStateGenerator = extractHiddenField(html, '__VIEWSTATEGENERATOR')

  // Echo the page's own pre-filled control values back in the Pagos search POST.
  const body = new URLSearchParams({
    'ctl00$ScriptManager1':
      'ctl00$updFooter|ctl00$ContentPlaceHolder1$mpHoriz$Pagos$cmdBuscaPagosCancel',
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    ctl00_ContentPlaceHolder1_mpHoriz_ClientState:
      '{"ActiveTabIndex":3,"TabState":[true,true,true,true,true]}',
    __LASTFOCUS: '',
    __VIEWSTATE: viewState,
    __VIEWSTATEGENERATOR: viewStateGenerator,
    'ctl00$ContentPlaceHolder1$mpHoriz$condiciones$txtExigibilidad': getInputValue(
      html,
      'condiciones_txtExigibilidad'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$condiciones$txtPlazo': getInputValue(
      html,
      'condiciones_txtPlazo'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$condiciones$txtPeriodicidad': getInputValue(
      html,
      'condiciones_txtPeriodicidad'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$condiciones$rdbEsquemas': getCheckedRadioValue(
      html,
      'condiciones\\$rdbEsquemas'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$condiciones$txtTipoTasa': getInputValue(
      html,
      'condiciones_txtTipoTasa'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$condiciones$txtTipoCalculo': getInputValue(
      html,
      'condiciones_txtTipoCalculo'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$condiciones$txtTasaBase': getInputValue(
      html,
      'condiciones_txtTasaBase'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$condiciones$txtPuntos': getInputValue(
      html,
      'condiciones_txtPuntos'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$condiciones$txtFact': getInputValue(
      html,
      'condiciones_txtFact'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$Cartera_vencida$txtFechaCarVen': getInputValue(
      html,
      'Cartera_vencida_txtFechaCarVen'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$Pagos$txtColorCarVen': '',
    'ctl00$ContentPlaceHolder1$mpHoriz$Pagos$txtColorSuspenso': '',
    'ctl00$ContentPlaceHolder1$mpHoriz$Pagos$txtFechaPagCanIni': getInputValue(
      html,
      'Pagos_txtFechaPagCanIni'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$Pagos$txtFechaPagCanFin': getInputValue(
      html,
      'Pagos_txtFechaPagCanFin'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$Deuda_Generada$txtFechaIniDeuda': getInputValue(
      html,
      'Deuda_Generada_txtFechaIniDeuda'
    ),
    'ctl00$ContentPlaceHolder1$mpHoriz$Deuda_Generada$txtFechaFinDeuda': getInputValue(
      html,
      'Deuda_Generada_txtFechaFinDeuda'
    ),
    'ctl00$ContentPlaceHolder1$hidPosicion': '400|120',
    'ctl00$ContentPlaceHolder1$cmdConsultaActivo': '',
    'ctl00$ContentPlaceHolder1$hidConAct': '',
    'ctl00$ContentPlaceHolder1$cmdTPagos': '0',
    'ctl00$ContentPlaceHolder1$hidScrollPos': '',
    'ctl00$ContentPlaceHolder1$txtContrato': '',
    'ctl00$ContentPlaceHolder1$cmbNoPago': '0',
    'ctl00$ContentPlaceHolder1$hidScrollPosE': '',
    __ASYNCPOST: 'true',
    'ctl00$ContentPlaceHolder1$mpHoriz$Pagos$cmdBuscaPagosCancel': 'Buscar',
  })

  return { viewState, viewStateGenerator, body }
}

const parsePagosTable = (responseText: string): Payment[] => {
  const tableMatch = responseText.match(
    /<table[^>]*id="[^"]*gvPagosH"[^>]*>([\s\S]*?)<\/table>/
  )
  if (!tableMatch) return []

  const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].slice(1)
  const payments: Payment[] = []

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]))
    if (cells.length < 11) continue
    if (cells[0] === 'Totales') continue

    payments.push({
      operationDate: cells[0],
      valueDate: cells[1],
      amount: cells[2],
      concept: cells[3],
      dueDate: cells[4],
      paymentType: cells[5],
      invoice: cells[6],
      capital: cells[7],
      interest: cells[8],
      iva: cells[9],
      total: cells[10],
    })
  }

  return payments
}

export const fetchContractPayments = async (args: FetchContractPaymentsArgs): Promise<Payment[]> => {
  try {
    const detailUrl = await resolveDetailUrl(args)
    const { body } = await loadDetailDefaults(detailUrl, args.cookie)

    const response = await fetch(detailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-MicrosoftAjax': 'Delta=true',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: detailUrl,
        'User-Agent': USER_AGENT,
        Cookie: args.cookie,
      },
      body: body.toString(),
    })

    if (!response.ok) throw new Error(`pagos search failed with status ${response.status}`)

    return parsePagosTable(await response.text())
  } catch (error) {
    throw new Error(
      `Error on fetchContractPayments: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
