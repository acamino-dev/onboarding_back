import { AuthError } from '../../../../shared/constants/errors'
import { extractHiddenField, stripTags, getInputValue } from './functions/parseHtml'
import { parseCreditTable, extractDeltaField } from './functions/parseCreditTable'
import type { ParsedCreditRow } from './functions/parseCreditTable'

export type { ParsedCreditRow }

export type SearchResult = {
  rows: ParsedCreditRow[]
  viewState: string
  viewStateGenerator: string
  clientCve: string
  clientNom: string
}

const CONSULTA_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export const searchCreditsByRfc = async (
  consultaUrl: string,
  cookie: string,
  rfc: string
): Promise<SearchResult> => {
  try {
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
        'User-Agent': CONSULTA_USER_AGENT,
        Cookie: cookie,
      },
      body: formBody.toString(),
    })

    if (!postResponse.ok) {
      throw new Error(`search failed with status ${postResponse.status}`)
    }

    const searchText = await postResponse.text()

    return {
      rows: parseCreditTable(searchText),
      viewState: extractDeltaField(searchText, '__VIEWSTATE'),
      viewStateGenerator: extractDeltaField(searchText, '__VIEWSTATEGENERATOR'),
      clientCve: getInputValue(searchText, '_txtCve'),
      clientNom: getInputValue(searchText, '_txtNom'),
    }
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new Error(
      `Error on searchCreditsByRfc: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
