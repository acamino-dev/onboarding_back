import { getSecret } from '../../../../../shared/utils/secrets'
import { loginToPortal, buildCatPersonaUrl } from '../../services/portalLogin'
import { fetchEmployeeInfo } from '../../services/fetchEmployeeInfo'
import { AuthError } from '../../../../../shared/constants/errors'
import { TEST_RFC_VALID, TEST_RFC_NOT_FOUND } from './helpers/constants'

const PORTAL_SECRET_ARN = process.env.PORTAL_SECRET_ARN as string

type PortalSecret = {
  user: string
  password: string
  url: string
}

describe('fetchEmployeeInfo integration', () => {
  let cookie: string
  let catPersonaUrl: string

  beforeAll(async () => {
    const raw = await getSecret(PORTAL_SECRET_ARN)
    const { url, user, password } = JSON.parse(raw) as PortalSecret
    cookie = await loginToPortal(url, user, password)
    catPersonaUrl = buildCatPersonaUrl(url)
  })

  it('returns empresa for a valid RFC', async () => {
    const result = await fetchEmployeeInfo(catPersonaUrl, cookie, TEST_RFC_VALID)

    console.log(`EmployeeInfo for RFC ${TEST_RFC_VALID}:`, result)

    expect(result).not.toBeNull()
    expect(typeof result!.empresa).toBe('string')
    expect(result!.empresa.length).toBeGreaterThan(0)
  })

  it('returns null when RFC has no record in portal', async () => {
    const result = await fetchEmployeeInfo(catPersonaUrl, cookie, TEST_RFC_NOT_FOUND)

    console.log(`Result for unknown RFC ${TEST_RFC_NOT_FOUND}:`, result)

    expect(result).toBeNull()
  })

  it('throws AuthError when cookie is invalid', async () => {
    const fakeCookie = 'ASP.NET_SessionId=fakesessionid; .ASPXAUTH=fakeauthtoken'

    await expect(fetchEmployeeInfo(catPersonaUrl, fakeCookie, TEST_RFC_VALID)).rejects.toThrow(
      AuthError
    )
  })

  it('throws wrapped Error when URL is unreachable', async () => {
    const badUrl = 'https://this-host-does-not-exist.pfsgroup-invalid.mx/path.aspx'

    await expect(fetchEmployeeInfo(badUrl, cookie, TEST_RFC_VALID)).rejects.toThrow(
      'Error on fetchEmployeeInfo:'
    )
  })
})
