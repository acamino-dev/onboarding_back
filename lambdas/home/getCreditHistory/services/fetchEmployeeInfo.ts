import { AuthError } from '../../../../shared/constants/errors'
import { extractHiddenField, parseSelectedOption } from '../functions/parseHtml'

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export type EmployeeInfo = {
  empresa: string
  mtoPersonaUrl: string
}

export const fetchEmployeeInfo = async (
  catPersonaUrl: string,
  cookie: string,
  rfc: string
): Promise<EmployeeInfo | null> => {
  try {
    const getResponse = await fetch(catPersonaUrl, { headers: { Cookie: cookie } })
    if (!getResponse.ok)
      throw new AuthError('Could not load catPersona page', {
        file: 'lambdas/home/getCreditHistory/services/fetchEmployeeInfo.ts',
        function: 'fetchEmployeeInfo',
        operation: 'load catPersona page',
      })

    const pageHtml = await getResponse.text()
    if (pageHtml.includes('Login1_UserName')) {
      throw new AuthError('Portal login failed: session cookie missing .ASPXAUTH', {
        file: 'lambdas/home/getCreditHistory/services/fetchEmployeeInfo.ts',
        function: 'fetchEmployeeInfo',
        operation: 'validate session cookie',
      })
    }

    const viewState = extractHiddenField(pageHtml, '__VIEWSTATE')
    const viewStateGenerator = extractHiddenField(pageHtml, '__VIEWSTATEGENERATOR')

    const formBody = new URLSearchParams({
      'ctl00$ScriptManager1': 'ctl00$ContentPlaceHolder1$UdPnlCatPersona|ctl00$ContentPlaceHolder1$cmdBuscar',
      __EVENTTARGET: '',
      __EVENTARGUMENT: '',
      __VIEWSTATE: viewState,
      __VIEWSTATEGENERATOR: viewStateGenerator,
      'ctl00$ContentPlaceHolder1$txtCve': '',
      'ctl00$ContentPlaceHolder1$rdbPersona': 'rdbRFC',
      'ctl00$ContentPlaceHolder1$txtRFC': rfc,
      'ctl00$ContentPlaceHolder1$txtNom': '',
      __ASYNCPOST: 'true',
      'ctl00$ContentPlaceHolder1$cmdBuscar': 'Buscar',
    })

    const postResponse = await fetch(catPersonaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-MicrosoftAjax': 'Delta=true',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: catPersonaUrl,
        'User-Agent': USER_AGENT,
        Cookie: cookie,
      },
      body: formBody.toString(),
    })

    if (!postResponse.ok) {
      throw new Error(`catPersona search failed with status ${postResponse.status}`)
    }

    const deltaText = await postResponse.text()

    const locationMatch = deltaText.match(/\|pageRedirect\|\|([^|]*)\|/)
    if (!locationMatch) return null

    const mtoPersonaUrl = new URL(decodeURIComponent(locationMatch[1]), catPersonaUrl).toString()

    const detailResponse = await fetch(mtoPersonaUrl, {
      headers: { Cookie: cookie },
    })

    if (!detailResponse.ok) {
      throw new Error(`mtoPersona load failed with status ${detailResponse.status}`)
    }

    const detailHtml = await detailResponse.text()
    const empresa = parseSelectedOption(detailHtml, 'ctl00_ContentPlaceHolder1_cmbForCont')

    return { empresa, mtoPersonaUrl }
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new Error(
      `Error on fetchEmployeeInfo: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
