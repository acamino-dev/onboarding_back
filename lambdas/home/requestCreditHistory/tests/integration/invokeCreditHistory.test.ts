import { invokeCreditHistory } from '../../services/invokeCreditHistory'
import { TEST_EMPLOYEE, TEST_RFC_NO_HISTORY } from './helpers/constants'

const FUNCTION_NAME = process.env.GET_CREDIT_HISTORY_FUNCTION_NAME!

describe('invokeCreditHistory integration', () => {
  it('happy path — returns CreditHistoryResult shape for a known RFC', async () => {
    const result = await invokeCreditHistory(TEST_EMPLOYEE.rfc, FUNCTION_NAME)

    console.table([result].map(r => ({
      history: r.history,
      operator: r.operator,
      activeCredit: r.activeCredit,
      balanceCount: Array.isArray(r.balance) ? r.balance.length : r.balance,
      company: r.company,
      frequency: r.frequency,
      daysPastDue: r.daysPastDue,
      antiguedad: r.antiguedad,
      acaminoTenure: r.acaminoTenure,
      creditHistoryCount: Array.isArray(r.creditHistory) ? r.creditHistory.length : r.creditHistory,
    })))

    if (result.history && result.balance.length > 0) {
      console.log('\nActive credit balances:')
      console.table(result.balance)
    }

    expect(typeof result.history).toBe('boolean')

    if (result.history) {
      expect(typeof result.operator).toBe('boolean')
      expect(typeof result.activeCredit).toBe('boolean')
      expect(Array.isArray(result.balance)).toBe(true)
      for (const item of result.balance) {
        expect(typeof item.creditId).toBe('string')
        expect(typeof item.balance).toBe('number')
        expect(item.lastPayment === null || typeof item.lastPayment === 'string').toBe(true)
        expect(item.nextPaymentDate === null || typeof item.nextPaymentDate === 'string').toBe(true)
        if (item.nextPaymentDate !== null) {
          expect(item.nextPaymentDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        }
      }
      expect(typeof result.company).toBe('string')
      expect(Array.isArray(result.creditHistory)).toBe(true)
      expect(typeof result.frequency).toBe('number')
      expect(Number.isInteger(result.daysPastDue)).toBe(true)
      expect(typeof result.antiguedad).toBe('number')
      expect(result.acaminoTenure === null || typeof result.acaminoTenure === 'number').toBe(true)
      if (result.acaminoTenure !== null) {
        expect(result.acaminoTenure).toBeGreaterThanOrEqual(0)
      }
    } else {
      expect(result.operator).toBeNull()
      expect(result.activeCredit).toBeNull()
      expect(result.balance).toBeNull()
      expect(result.company).toBeNull()
      expect(result.creditHistory).toBeNull()
      expect(result.frequency).toBeNull()
      expect(result.daysPastDue).toBeNull()
      expect(result.antiguedad).toBeNull()
      expect(result.acaminoTenure).toBeNull()
    }
  })

  it('returns history: false with all null fields for RFC with no portal records', async () => {
    const result = await invokeCreditHistory(TEST_RFC_NO_HISTORY, FUNCTION_NAME)

    console.table([result].map(r => ({
      history: r.history,
      operator: r.operator,
      activeCredit: r.activeCredit,
      balanceCount: Array.isArray(r.balance) ? r.balance.length : r.balance,
      company: r.company,
      frequency: r.frequency,
      daysPastDue: r.daysPastDue,
      antiguedad: r.antiguedad,
      acaminoTenure: r.acaminoTenure,
      creditHistoryCount: Array.isArray(r.creditHistory) ? r.creditHistory.length : r.creditHistory,
    })))

    expect(result.history).toBe(false)
    expect(result.operator).toBeNull()
    expect(result.activeCredit).toBeNull()
    expect(result.balance).toBeNull()
    expect(result.company).toBeNull()
    expect(result.creditHistory).toBeNull()
    expect(result.frequency).toBeNull()
    expect(result.daysPastDue).toBeNull()
    expect(result.antiguedad).toBeNull()
    expect(result.acaminoTenure).toBeNull()
  })

  it('throws wrapped Error when function name is invalid', async () => {
    await expect(
      invokeCreditHistory(TEST_EMPLOYEE.rfc, 'nonexistent-function-xyz')
    ).rejects.toThrow(/Error on invokeCreditHistory/)
  })
})
