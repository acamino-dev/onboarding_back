import { AuthError } from '../../../../shared/constants/errors'
import { extractHiddenField } from './functions/parseHtml'

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export type EmploymentData = {
  puesto: string
  antiguedad: number
}

export const fetchEmploymentData = async (
  mtoPersonaUrl: string,
  cookie: string
): Promise<EmploymentData> => {
  try {
    const getResponse = await fetch(mtoPersonaUrl, { headers: { Cookie: cookie } })
    if (!getResponse.ok) throw new AuthError('Could not load mtoPersona page')

    const pageHtml = await getResponse.text()
    if (pageHtml.includes('Login1_UserName')) {
      throw new AuthError('Portal login failed: session cookie missing .ASPXAUTH')
    }

    const viewState = extractHiddenField(pageHtml, '__VIEWSTATE')
    const viewStateGenerator = extractHiddenField(pageHtml, '__VIEWSTATEGENERATOR')

    const formBody = new URLSearchParams({
      'ctl00$ScriptManager1': 'ctl00$updFooter|ctl00$ContentPlaceHolder1$btnReferencia',
      __EVENTTARGET: '',
      __EVENTARGUMENT: '',
      __LASTFOCUS: '',
      'ctl00_ContentPlaceHolder1_tsPersona_ClientState':
        '{"ActiveTabIndex":4,"TabState":[true,true,true,true,true,true]}',
      __VIEWSTATE: viewState,
      __VIEWSTATEGENERATOR: viewStateGenerator,
      __ASYNCPOST: 'true',
      'ctl00$ContentPlaceHolder1$btnReferencia': 'Referencias',
    })

    const postResponse = await fetch(mtoPersonaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-MicrosoftAjax': 'Delta=true',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: mtoPersonaUrl,
        'User-Agent': USER_AGENT,
        Cookie: cookie,
      },
      body: formBody.toString(),
    })

    if (!postResponse.ok) {
      throw new Error(`referencias POST failed with status ${postResponse.status}`)
    }

    const deltaText = await postResponse.text()

    const locationMatch = deltaText.match(/\|pageRedirect\|\|([^|]*)\|/)
    if (!locationMatch) throw new Error('could not find referencias redirect in delta response')

    const comRefUrl = new URL(decodeURIComponent(locationMatch[1]), mtoPersonaUrl).toString()

    const comRefResponse = await fetch(comRefUrl, { headers: { Cookie: cookie } })
    if (!comRefResponse.ok) {
      throw new Error(`comRef load failed with status ${comRefResponse.status}`)
    }

    const comRefHtml = await comRefResponse.text()
    const puesto = extractHiddenField(comRefHtml, 'ctl00_ContentPlaceHolder1_txtPuesto')
    const antiguedadRaw = extractHiddenField(comRefHtml, 'ctl00_ContentPlaceHolder1_txtAntiguedad')

    return {
      puesto,
      antiguedad: parseInt(antiguedadRaw, 10) || 0,
    }
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new Error(
      `Error on fetchEmploymentData: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
