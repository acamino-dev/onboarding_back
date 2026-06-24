import { extractHiddenField } from './parseHtml'
import { getInputValue, getCheckedRadioValue } from './parseHtml'

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export type DetailDefaults = {
  viewState: string
  viewStateGenerator: string
  body: URLSearchParams
}

export const loadDetailDefaults = async (
  detailUrl: string,
  cookie: string
): Promise<DetailDefaults> => {
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
