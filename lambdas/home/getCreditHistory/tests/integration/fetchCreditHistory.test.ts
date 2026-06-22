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
    expect(typeof entry.payments[0].operationDate).toBe('string')
    expect(typeof entry.payments[0].dueDate).toBe('string')
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
