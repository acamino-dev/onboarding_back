import { invokeCreditHistory } from '../../services/invokeCreditHistory'
import { TEST_EMPLOYEE } from './helpers/constants'

const FUNCTION_NAME = process.env.GET_CREDIT_HISTORY_FUNCTION_NAME!

describe('invokeCreditHistory integration', () => {
  it('happy path — returns CreditHistoryResult shape for a known RFC', async () => {
    const result = await invokeCreditHistory(TEST_EMPLOYEE.rfc, FUNCTION_NAME)

    console.table([result].map(r => ({
      history: r.history,
      operator: r.operator,
      activeCredit: r.activeCredit,
      balance: r.balance,
      company: r.company,
      frequency: r.frequency,
      daysPastDue: r.daysPastDue,
      antiguedad: r.antiguedad,
      creditHistoryCount: Array.isArray(r.creditHistory) ? r.creditHistory.length : r.creditHistory,
    })))

    expect(typeof result.history).toBe('boolean')

    if (result.history) {
      expect(typeof result.operator).toBe('boolean')
      expect(typeof result.activeCredit).toBe('boolean')
      expect(typeof result.balance).toBe('number')
      expect(typeof result.company).toBe('string')
      expect(Array.isArray(result.creditHistory)).toBe(true)
      expect(typeof result.frequency).toBe('number')
      expect(typeof result.daysPastDue).toBe('number')
      expect(typeof result.antiguedad).toBe('number')
    } else {
      expect(result.operator).toBeNull()
      expect(result.activeCredit).toBeNull()
      expect(result.balance).toBeNull()
      expect(result.company).toBeNull()
      expect(result.creditHistory).toBeNull()
      expect(result.frequency).toBeNull()
      expect(result.daysPastDue).toBeNull()
      expect(result.antiguedad).toBeNull()
    }
  })

  it('throws wrapped Error when function name is invalid', async () => {
    await expect(
      invokeCreditHistory(TEST_EMPLOYEE.rfc, 'nonexistent-function-xyz')
    ).rejects.toThrow(/Error on invokeCreditHistory/)
  })
})
