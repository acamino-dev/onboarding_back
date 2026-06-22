import { fetchCreditHistory } from '../../services/fetchCreditHistory'

const PORTAL_SECRET_ARN = process.env.PORTAL_SECRET_ARN as string
const TEST_RFC_WITH_HISTORY = 'TESE870227M20'
const TEST_RFC_WITHOUT_HISTORY = 'AAAA000101AAA'

describe('fetchCreditHistory integration', () => {
  it('returns history: true with credit entries when RFC exists', async () => {
    const result = await fetchCreditHistory(TEST_RFC_WITH_HISTORY, PORTAL_SECRET_ARN)

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
    const result = await fetchCreditHistory(TEST_RFC_WITHOUT_HISTORY, PORTAL_SECRET_ARN)

    expect(result.history).toBe(false)
    expect(result.operator).toBeNull()
    expect(result.activeCredit).toBeNull()
    expect(result.balance).toBeNull()
    expect(result.credit).toBeNull()
    expect(result.creditHistory).toBeNull()
  })
})
