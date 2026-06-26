import { getSecret } from '../../../../../shared/utils/secrets'
import { loginToPortal, buildConsultaUrl } from '../../services/portalLogin'
import { searchCreditsByRfc, type ParsedCreditRow } from '../../services/searchCreditsByRfc'
import { fetchContractPayments, type ContractContext } from '../../services/fetchContractPayments'
import { computeCreditFrequency } from '../../functions/computeCreditFrequency'
import { computeDaysPastDue } from '../../functions/computeDaysPastDue'
import { computeNextPaymentDate } from '../../functions/computeNextPaymentDate'
import type { CreditEntry } from '../../types/CreditHistoryResult'
import { TEST_RFC_VALID } from './helpers/constants'
import type { PortalSecret } from '../../types/PortalSecret'

jest.setTimeout(120000)

const PORTAL_SECRET_ARN = process.env.PORTAL_SECRET_ARN as string

describe('computeFunctions integration', () => {
  let rows: ParsedCreditRow[]
  let creditHistory: CreditEntry[]

  beforeAll(async () => {
    const raw = await getSecret(PORTAL_SECRET_ARN)
    const { url, user, password } = JSON.parse(raw) as PortalSecret
    const cookie = await loginToPortal(url, user, password)
    const consultaUrl = buildConsultaUrl(url)
    const searchResult = await searchCreditsByRfc(consultaUrl, cookie, TEST_RFC_VALID)

    rows = searchResult.rows

    const context: ContractContext = {
      searchUrl: consultaUrl,
      cookie,
      viewState: searchResult.viewState,
      viewStateGenerator: searchResult.viewStateGenerator,
      rfc: TEST_RFC_VALID,
      clientCve: searchResult.clientCve,
      clientNom: searchResult.clientNom,
    }

    creditHistory = await fetchContractPayments(rows, context)
  })

  it('computeCreditFrequency returns a number and logs result', () => {
    const frequency = computeCreditFrequency(rows)

    console.log(`\nRows used (${rows.length} total):`)
    console.table(rows.map((r) => ({ creditId: r.creditId, status: r.status, fechaPrimerPago: r.fechaPrimerPago, fechaUltimoPago: r.fechaUltimoPago })))
    console.log(`\nfrequency → ${frequency} months`)

    expect(typeof frequency).toBe('number')
    expect(frequency).toBeGreaterThanOrEqual(0)
  })

  it('computeDaysPastDue returns a number and logs result', () => {
    const daysPastDue = computeDaysPastDue(creditHistory)

    for (const entry of creditHistory) {
      console.log(`\nCredit ${entry.creditId} — periodicidad: ${entry.periodicidad}`)
      if (entry.payments.length > 0) {
        console.table(entry.payments.map((p) => ({ dueDate: p.dueDate, operationDate: p.operationDate })))
      }
    }
    console.log(`\ndaysPastDue → ${daysPastDue} days (average over-grace payments)`)

    expect(typeof daysPastDue).toBe('number')
    expect(daysPastDue).toBeGreaterThanOrEqual(0)
  })

  it('activeBalances maps ACTIVO credits with last payment and next payment date', () => {
    const activeBalances = rows
      .filter((row) => row.status === 'ACTIVO')
      .map((row) => {
        const entry = creditHistory.find((e) => e.creditId === row.creditId)
        const lastPayment = entry?.payments.at(-1)?.concept ?? null
        const nextPaymentDate = entry ? computeNextPaymentDate(entry) : null
        return { creditId: row.creditId, balance: row.balance, lastPayment, nextPaymentDate }
      })

    console.log('\nActive credit balances:')
    console.table(activeBalances)

    expect(Array.isArray(activeBalances)).toBe(true)
    for (const item of activeBalances) {
      expect(typeof item.creditId).toBe('string')
      expect(typeof item.balance).toBe('number')
      expect(item.lastPayment === null || typeof item.lastPayment === 'string').toBe(true)
      expect(item.nextPaymentDate === null || typeof item.nextPaymentDate === 'string').toBe(true)
      if (item.nextPaymentDate !== null) {
        expect(item.nextPaymentDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
      }
    }
  })
})
