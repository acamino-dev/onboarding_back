import { AuthError } from '../../../../shared/constants/errors'

type ViewStateTokens = {
  __VIEWSTATE: string
  __VIEWSTATEGENERATOR: string
  __EVENTVALIDATION: string
}

const CONSULTA_FINANCIERA_PATH = '/Migrado/su_conFinanciera.aspx'

export const buildConsultaUrl = (loginUrl: string): string => {
  const parsed = new URL(loginUrl)
  const segments = parsed.pathname.split('/').filter(Boolean)
  const appSegment = segments[0] ?? ''
  return `${parsed.origin}/${appSegment}${CONSULTA_FINANCIERA_PATH}`
}

const extractHiddenField = (html: string, id: string): string => {
  const match =
    html.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`, 'i')) ??
    html.match(new RegExp(`value="([^"]*)"[^>]*id="${id}"`, 'i'))
  return match?.[1] ?? ''
}

const extractViewStateTokens = (html: string): ViewStateTokens => ({
  __VIEWSTATE: extractHiddenField(html, '__VIEWSTATE'),
  __VIEWSTATEGENERATOR: extractHiddenField(html, '__VIEWSTATEGENERATOR'),
  __EVENTVALIDATION: extractHiddenField(html, '__EVENTVALIDATION'),
})

const parseCookies = (headers: Headers): string =>
  headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')

export const loginToPortal = async (url: string, user: string, password: string): Promise<string> => {
  const getResponse = await fetch(url)
  if (!getResponse.ok) throw new AuthError('Portal login failed: could not load login page')

  const loginPageHtml = await getResponse.text()
  const sessionCookie = parseCookies(getResponse.headers)
  const tokens = extractViewStateTokens(loginPageHtml)

  const formBody = new URLSearchParams({
    ...tokens,
    'Login1$UserName': user,
    'Login1$Password': password,
    'Login1$ImageButton1.x': '0',
    'Login1$ImageButton1.y': '0',
  })

  const postResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(sessionCookie && { Cookie: sessionCookie }),
    },
    body: formBody.toString(),
    redirect: 'manual',
  })

  if (postResponse.status !== 200 && postResponse.status !== 302) {
    throw new AuthError(`Portal login failed: unexpected status ${postResponse.status}`)
  }

  await postResponse.text()
  return sessionCookie
}

