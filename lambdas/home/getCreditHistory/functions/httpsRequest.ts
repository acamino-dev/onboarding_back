import https from 'https'

export type HttpResult = {
  statusCode: number
  cookies: string
  location: string | null
  body: string
}

export const httpsRequest = (
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
