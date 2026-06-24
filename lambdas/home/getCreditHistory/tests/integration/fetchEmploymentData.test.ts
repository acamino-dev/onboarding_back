import { getSecret } from '../../../../../shared/utils/secrets'
import { loginToPortal, buildCatPersonaUrl } from '../../services/portalLogin'
import { fetchEmployeeInfo } from '../../services/fetchEmployeeInfo'
import { fetchEmploymentData } from '../../services/fetchEmploymentData'
import { AuthError } from '../../../../../shared/constants/errors'
import { TEST_RFC_VALID } from './helpers/constants'
import type { PortalSecret } from '../../types/PortalSecret'

const PORTAL_SECRET_ARN = process.env.PORTAL_SECRET_ARN as string

describe('fetchEmploymentData integration', () => {
  let cookie: string
  let mtoPersonaUrl: string

  beforeAll(async () => {
    const raw = await getSecret(PORTAL_SECRET_ARN)
    const { url, user, password } = JSON.parse(raw) as PortalSecret
    cookie = await loginToPortal(url, user, password)
    const catPersonaUrl = buildCatPersonaUrl(url)
    const employeeInfo = await fetchEmployeeInfo(catPersonaUrl, cookie, TEST_RFC_VALID)
    if (!employeeInfo) throw new Error('fetchEmployeeInfo returned null — cannot run fetchEmploymentData tests')
    mtoPersonaUrl = employeeInfo.mtoPersonaUrl
  })

  it('returns puesto and antiguedad for a valid mtoPersonaUrl', async () => {
    const result = await fetchEmploymentData(mtoPersonaUrl, cookie)

    console.log(`puesto: ${result.puesto}`)
    console.log(`antiguedad (meses): ${result.antiguedad}`)

    expect(typeof result.puesto).toBe('string')
    expect(typeof result.antiguedad).toBe('number')
  })

  it('throws AuthError when cookie is invalid', async () => {
    const fakeCookie = 'ASP.NET_SessionId=fakesessionid; .ASPXAUTH=fakeauthtoken'

    await expect(fetchEmploymentData(mtoPersonaUrl, fakeCookie)).rejects.toThrow(AuthError)
  })

  it('throws wrapped Error when URL is unreachable', async () => {
    const badUrl = 'https://this-host-does-not-exist.pfsgroup-invalid.mx/path.aspx'

    await expect(fetchEmploymentData(badUrl, cookie)).rejects.toThrow('Error on fetchEmploymentData:')
  })
})
