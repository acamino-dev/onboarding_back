import { getSecret } from '../../../../../shared/utils/secrets'
import { loginToPortal, buildConsultaUrl } from '../../services/portalLogin'
import { searchCreditsByRfc, type ParsedCreditRow } from '../../services/searchCreditsByRfc'
import { fetchContractPayments, type ContractContext } from '../../services/fetchContractPayments'
import { TEST_RFC_VALID } from './helpers/constants'
import type { PortalSecret } from '../../types/PortalSecret'

jest.setTimeout(120000)

const PORTAL_SECRET_ARN = process.env.PORTAL_SECRET_ARN as string

describe('fetchContractPayments integration', () => {
  let context: ContractContext
  let rows: ParsedCreditRow[]

  beforeAll(async () => {
    const raw = await getSecret(PORTAL_SECRET_ARN)
    const { url, user, password } = JSON.parse(raw) as PortalSecret
    const cookie = await loginToPortal(url, user, password)
    const consultaUrl = buildConsultaUrl(url)
    const searchResult = await searchCreditsByRfc(consultaUrl, cookie, TEST_RFC_VALID)

    rows = searchResult.rows
    context = {
      searchUrl: consultaUrl,
      cookie,
      viewState: searchResult.viewState,
      viewStateGenerator: searchResult.viewStateGenerator,
      rfc: TEST_RFC_VALID,
      clientCve: searchResult.clientCve,
      clientNom: searchResult.clientNom,
    }
  })

  it('fetches payment history for each credit', async () => {
    const entries = await fetchContractPayments(rows, context)

    for (const entry of entries) {
      console.log(`\nCredit ${entry.creditId} — periodicidad: ${entry.periodicidad} — ${entry.payments.length} payment(s)`)
      if (entry.payments.length > 0) {
        console.table(entry.payments)
      }
    }

    expect(Array.isArray(entries)).toBe(true)
    for (const entry of entries) {
      expect(typeof entry.creditId).toBe('string')
      expect(Array.isArray(entry.payments)).toBe(true)
    }
  })
})
