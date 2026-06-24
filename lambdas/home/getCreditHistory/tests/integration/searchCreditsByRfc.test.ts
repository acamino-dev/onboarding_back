import { getSecret } from '../../../../../shared/utils/secrets'
import { loginToPortal, buildConsultaUrl } from '../../services/portalLogin'
import { searchCreditsByRfc } from '../../services/searchCreditsByRfc'
import { TEST_RFC_VALID, TEST_RFC_NOT_FOUND } from './helpers/constants'

const PORTAL_SECRET_ARN = process.env.PORTAL_SECRET_ARN as string

type PortalSecret = {
  user: string
  password: string
  url: string
}

describe('searchCreditsByRfc integration', () => {
  let cookie: string
  let consultaUrl: string

  beforeAll(async () => {
    const raw = await getSecret(PORTAL_SECRET_ARN)
    const { url, user, password } = JSON.parse(raw) as PortalSecret
    cookie = await loginToPortal(url, user, password)
    consultaUrl = buildConsultaUrl(url)
  })

  it('returns rows with credit data when RFC exists', async () => {
    const result = await searchCreditsByRfc(consultaUrl, cookie, TEST_RFC_VALID)

    console.log(`Credits found for RFC ${TEST_RFC_VALID}: ${result.rows.length}`)
    result.rows.forEach((row, i) => {
      console.log(`  [${i + 1}] creditId=${row.creditId} | status=${row.status} | balance=${row.balance}`)
    })

    expect(Array.isArray(result.rows)).toBe(true)
    expect(result.rows.length).toBeGreaterThan(0)

    const row = result.rows[0]
    expect(typeof row.creditId).toBe('string')
    expect(row.creditId.length).toBeGreaterThan(0)
    expect(typeof row.status).toBe('string')
    expect(typeof row.balance).toBe('number')
    expect(typeof row.eventTarget).toBe('string')

    expect(typeof result.viewState).toBe('string')
    expect(typeof result.viewStateGenerator).toBe('string')
    expect(typeof result.clientCve).toBe('string')
    expect(typeof result.clientNom).toBe('string')
  })

  it('returns empty rows when RFC has no records', async () => {
    const result = await searchCreditsByRfc(consultaUrl, cookie, TEST_RFC_NOT_FOUND)

    console.log(`Credits found for unknown RFC ${TEST_RFC_NOT_FOUND}: ${result.rows.length}`)

    expect(Array.isArray(result.rows)).toBe(true)
    expect(result.rows.length).toBe(0)
  })
})
