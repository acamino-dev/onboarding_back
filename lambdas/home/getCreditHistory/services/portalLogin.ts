import https from 'https'
import { AuthError } from '../../../../shared/constants/errors'

type ViewStateTokens = {
  __VIEWSTATE: string
  __VIEWSTATEGENERATOR: string
  __EVENTVALIDATION: string
}

type HttpResult = {
  statusCode: number
  cookies: string
  location: string | null
  body: string
}

const CONSULTA_FINANCIERA_PATH = '/Migrado/su_conFinanciera.aspx'

export const buildConsultaUrl = (loginUrl: string): string => {
  const parsed = new URL(loginUrl)
  const segments = parsed.pathname.split('/').filter(Boolean)
  const appSegment = segments[0] ?? ''
  return `${parsed.origin}/${appSegment}${CONSULTA_FINANCIERA_PATH}`
}

export const extractHiddenField = (html: string, id: string): string => {
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

export const mergeCookies = (base: string, extra: string): string => {
  if (!extra) return base
  if (!base) return extra
  const map = new Map<string, string>()
  for (const c of [...base.split('; '), ...extra.split('; ')]) {
    const name = c.split('=')[0]
    if (name) map.set(name, c)
  }
  return [...map.values()].join('; ')
}

const httpsRequest = (
  url: string,
  options: { method: string; headers?: Record<string, string | number>; body?: string }
): Promise<HttpResult> =>
  new Promise((resolve, reject) => {
    const { hostname, pathname, search, port } = new URL(url)
    const bodyBuf = options.body ? Buffer.from(options.body) : undefined

    const req = https.request(
      {
        hostname,
        path: `${pathname}${search}`,
        method: options.method,
        port: port || 443,
        headers: {
          ...options.headers,
          ...(bodyBuf && { 'Content-Length': bodyBuf.length }),
        },
      },
      (res) => {
        const cookies = (res.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]).join('; ')
        const location = (res.headers['location'] as string | undefined) ?? null
        let body = ''
        res.on('data', (chunk: Buffer) => { body += chunk.toString() })
        res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, cookies, location, body }))
      }
    )

    req.on('error', reject)
    if (bodyBuf) req.write(bodyBuf)
    req.end()
  })

export const loginToPortal = async (url: string, user: string, password: string): Promise<string> => {
  const loginPage = await httpsRequest(url, { method: 'GET' })
  if (loginPage.statusCode !== 200) {
    throw new AuthError('Portal login failed: could not load login page')
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
    throw new AuthError(`Portal login failed: unexpected status ${postResult.statusCode}`)
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
