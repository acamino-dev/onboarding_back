import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { storeAnalysis } from '../../services/storeAnalysis'
import { TEST_DYNAMO_STORE_ID } from './helpers/constants'
import type { AnalysisResponse } from '../../types/AnalysisResponse'
import type { CreditEngineResult } from '../../creditEngine/creditEngine'

const TABLE_NAME = process.env.CREDIT_HISTORY_REQUESTS_TABLE_NAME!
const TEST_USER_ID = TEST_DYNAMO_STORE_ID

const SAMPLE_BALANCE = [
  { creditId: 'CRED-001', balance: 5000, lastPayment: 'PAGO 1 de 12', nextPaymentDate: '15/11/2023' },
]

const SAMPLE_CREDIT_OFFER: CreditEngineResult = {
  score: 12,
  breakdown: { creditCount: 2, acaminoTenure: 2, frequency: 2, company: 1, laborSeniority: 5 },
  offer: { amount: 10600, tasa: 133, plazo: 9 },
}

afterEach(async () => {
  await dynamoDb.delete({ TableName: TABLE_NAME, Key: { userId: TEST_USER_ID } })
})

describe('storeAnalysis integration', () => {
  it('stores active_credit result with correct fields', async () => {
    const analyzedAt = new Date().toISOString()
    const result: AnalysisResponse = { type: 'active_credit', balance: SAMPLE_BALANCE, analyzedAt }

    await storeAnalysis(TEST_USER_ID, TABLE_NAME, result)

    const response = await dynamoDb.get({ TableName: TABLE_NAME, Key: { userId: TEST_USER_ID } })
    const item = response.Item!
    expect(item.userId).toBe(TEST_USER_ID)
    expect(item.type).toBe('active_credit')
    expect(item.balance).toEqual(SAMPLE_BALANCE)
    expect(typeof item.analyzedAt).toBe('number')
    expect(item.analyzedAt).toBe(Math.floor(new Date(analyzedAt).getTime() / 1000))
    expect(item.creditOffer).toBeUndefined()
  })

  it('stores offer result with correct fields', async () => {
    const analyzedAt = new Date().toISOString()
    const result: AnalysisResponse = { type: 'offer', creditOffer: SAMPLE_CREDIT_OFFER, analyzedAt }

    await storeAnalysis(TEST_USER_ID, TABLE_NAME, result)

    const response = await dynamoDb.get({ TableName: TABLE_NAME, Key: { userId: TEST_USER_ID } })
    const item = response.Item!
    expect(item.userId).toBe(TEST_USER_ID)
    expect(item.type).toBe('offer')
    expect(item.creditOffer).toEqual(SAMPLE_CREDIT_OFFER)
    expect(typeof item.analyzedAt).toBe('number')
    expect(item.analyzedAt).toBe(Math.floor(new Date(analyzedAt).getTime() / 1000))
    expect(item.balance).toBeUndefined()
  })

  it('overwrites existing record for the same user', async () => {
    const first: AnalysisResponse = { type: 'active_credit', balance: SAMPLE_BALANCE, analyzedAt: new Date().toISOString() }
    await storeAnalysis(TEST_USER_ID, TABLE_NAME, first)

    const second: AnalysisResponse = { type: 'offer', creditOffer: SAMPLE_CREDIT_OFFER, analyzedAt: new Date().toISOString() }
    await storeAnalysis(TEST_USER_ID, TABLE_NAME, second)

    const response = await dynamoDb.get({ TableName: TABLE_NAME, Key: { userId: TEST_USER_ID } })
    expect(response.Item!.type).toBe('offer')
    expect(response.Item!.balance).toBeUndefined()
  })

  it('throws wrapped error when table name is invalid', async () => {
    const result: AnalysisResponse = {
      type: 'active_credit',
      balance: SAMPLE_BALANCE,
      analyzedAt: new Date().toISOString(),
    }
    await expect(storeAnalysis(TEST_USER_ID, 'nonexistent-table-xyz', result)).rejects.toThrow(
      /Error on storeAnalysis/
    )
  })
})
