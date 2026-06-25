import { AuthError } from '../../../../shared/constants/errors'
import { httpsRequest } from '../functions/httpsRequest'
import { mergeCookies } from '../functions/mergeCookies'
import { extractHiddenField } from '../functions/parseHtml'

export { buildConsultaUrl, buildCatPersonaUrl } from '../functions/buildConsultaUrl'

type ViewStateTokens = {
  __VIEWSTATE: string
  __VIEWSTATEGENERATOR: string
  __EVENTVALIDATION: string
}

const extractViewStateTokens = (html: string): ViewStateTokens => ({
  __VIEWSTATE: extractHiddenField(html, '__VIEWSTATE'),
  __VIEWSTATEGENERATOR: extractHiddenField(html, '__VIEWSTATEGENERATOR'),
  __EVENTVALIDATION: extractHiddenField(html, '__EVENTVALIDATION'),
})

export const loginToPortal = async (url: string, user: string, password: string): Promise<string> => {
  const loginPage = await httpsRequest(url, { method: 'GET' })
  if (loginPage.statusCode !== 200) {
    throw new AuthError('Portal login failed: could not load login page', {
      file: 'lambdas/home/getCreditHistory/services/portalLogin.ts',
      function: 'loginToPortal',
      operation: 'load login page',
    })
  }

  let cookies = loginPage.cookies
  const tokens = extractViewStateTokens(loginPage.body)

  const formBody = new URLSearchParams({
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    __VIEWSTATE: tokens.__VIEWSTATE,
    __VIEWSTATEGENERATOR: tokens.__VIEWSTATEGENERATOR,
    'Login1$UserName': user,
    'Login1$Password': password,
    'Login1$ImageButton1': 'Entrar',
    hdfValidaTimer: '0',
    hdfConteo: '5',
  })

  const postResult = await httpsRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: url,
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...(cookies && { Cookie: cookies }),
    },
    body: formBody.toString(),
  })

  if (postResult.statusCode !== 200 && postResult.statusCode !== 302) {
    throw new AuthError(`Portal login failed: unexpected status ${postResult.statusCode}`, {
      file: 'lambdas/home/getCreditHistory/services/portalLogin.ts',
      function: 'loginToPortal',
      operation: 'submit login form',
    })
  }

  cookies = mergeCookies(cookies, postResult.cookies)

  // Follow redirect chain — .ASPXAUTH may be set by the redirect destination, not the 302 itself
  let redirectUrl = postResult.location ? new URL(postResult.location, url).toString() : null
  let hops = 0

  while (redirectUrl && hops < 5) {
    const redirect = await httpsRequest(redirectUrl, {
      method: 'GET',
      headers: { Cookie: cookies },
    })
    cookies = mergeCookies(cookies, redirect.cookies)

    if (redirect.statusCode >= 300 && redirect.statusCode < 400 && redirect.location) {
      redirectUrl = new URL(redirect.location, redirectUrl).toString()
    } else {
      break
    }
    hops++
  }

  return cookies
}
