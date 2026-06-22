import { fetchCreditHistory } from '../../services/fetchCreditHistory'
import { TEST_RFC_VALID, TEST_RFC_NOT_FOUND } from './helpers/constants'

const PORTAL_SECRET_ARN = process.env.PORTAL_SECRET_ARN as string

describe('fetchCreditHistory integration', () => {
  it('returns credit history for a valid RFC', async () => {
    const result = await fetchCreditHistory(TEST_RFC_VALID, PORTAL_SECRET_ARN)
    expect(result.history).toBe(true)
    if (result.history) {
      expect(typeof result.activeCredit).toBe('boolean')
    }
  }, 600000)

  it('returns history false when RFC not found in portal', async () => {
    const result = await fetchCreditHistory(TEST_RFC_NOT_FOUND, PORTAL_SECRET_ARN)
    expect(result.history).toBe(false)
    expect(result.operator).toBeNull()
    expect(result.activeCredit).toBeNull()
    expect(result.balance).toBeNull()
    expect(result.credit).toBeNull()
    expect(result.creditHistory).toBeNull()
  }, 600000)
})
