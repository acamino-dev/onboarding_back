import { getSecret } from '../../../../../shared/utils/secrets'
import { loginToPortal } from '../../services/portalLogin'

const PORTAL_SECRET_ARN = process.env.PORTAL_SECRET_ARN as string

type PortalSecret = {
  user: string
  password: string
  url: string
}

describe('loginToPortal integration', () => {
  it('completes login and returns session cookie with .ASPXAUTH', async () => {
    const raw = await getSecret(PORTAL_SECRET_ARN)
    const { url, user, password } = JSON.parse(raw) as PortalSecret
    const cookie = await loginToPortal(url, user, password)

    console.log('Session cookie:', cookie)

    expect(cookie.length).toBeGreaterThan(0)
    expect(cookie).toContain('ASP.NET_SessionId')
    expect(cookie).toContain('.ASPXAUTH')
  })
})
