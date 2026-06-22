import { fetchCreditHistory } from '../../services/fetchCreditHistory'
import { TEST_RFC_VALID, TEST_RFC_NOT_FOUND } from './helpers/constants'

const PORTAL_SECRET_ARN = process.env.PORTAL_SECRET_ARN as string

describe('fetchCreditHistory integration', () => {
  it('returns history: true with credit entries when RFC exists', async () => {
    const result = await fetchCreditHistory(TEST_RFC_VALID, PORTAL_SECRET_ARN)

    expect(result.history).toBe(true)
    if (!result.history) return

    expect(typeof result.operator).toBe('boolean')
    expect(typeof result.activeCredit).toBe('boolean')
    expect(typeof result.balance).toBe('number')
    expect(typeof result.credit).toBe('string')
    expect(Array.isArray(result.creditHistory)).toBe(true)
    expect(result.creditHistory.length).toBeGreaterThan(0)

    const entry = result.creditHistory[0]
    expect(typeof entry.creditId).toBe('string')
    expect(entry.creditId.length).toBeGreaterThan(0)
    expect(Array.isArray(entry.payments)).toBe(true)
    expect(entry.payments.length).toBeGreaterThan(0)

    const payment = entry.payments[0]
    expect(typeof payment.operationDate).toBe('string')
    expect(typeof payment.valueDate).toBe('string')
    expect(typeof payment.amount).toBe('string')
    expect(typeof payment.concept).toBe('string')
    expect(typeof payment.dueDate).toBe('string')
    expect(typeof payment.paymentType).toBe('string')
    expect(typeof payment.invoice).toBe('string')
    expect(typeof payment.capital).toBe('string')
    expect(typeof payment.interest).toBe('string')
    expect(typeof payment.iva).toBe('string')
    expect(typeof payment.total).toBe('string')

    // Totales summary row must be filtered out of the ledger
    expect(entry.payments.every((p) => p.operationDate !== 'Totales')).toBe(true)
  })

  it('returns history: false with all nulls when RFC has no records', async () => {
    const result = await fetchCreditHistory(TEST_RFC_NOT_FOUND, PORTAL_SECRET_ARN)

    expect(result.history).toBe(false)
    expect(result.operator).toBeNull()
    expect(result.activeCredit).toBeNull()
    expect(result.balance).toBeNull()
    expect(result.credit).toBeNull()
    expect(result.creditHistory).toBeNull()
  })
})
