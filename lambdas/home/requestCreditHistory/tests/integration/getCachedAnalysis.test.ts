import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { getCachedAnalysis } from '../../services/getCachedAnalysis'
import { TEST_DYNAMO_GET_CACHED_ID } from './helpers/constants'
import type { CreditEngineResult } from '../../creditEngine/creditEngine'

const TABLE_NAME = process.env.CREDIT_HISTORY_REQUESTS_TABLE_NAME!
const TEST_USER_ID = TEST_DYNAMO_GET_CACHED_ID
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60

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

describe('getCachedAnalysis integration', () => {
  it('returns null when no record exists', async () => {
    const result = await getCachedAnalysis(TEST_USER_ID, TABLE_NAME)
    expect(result).toBeNull()
  })

  it('returns active_credit cached result when record exists within 30 days', async () => {
    const analyzedAt = Math.floor(Date.now() / 1000) - 60
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: { userId: TEST_USER_ID, analyzedAt, type: 'active_credit', balance: SAMPLE_BALANCE },
    })

    const result = await getCachedAnalysis(TEST_USER_ID, TABLE_NAME)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('active_credit')
    if (result!.type === 'active_credit') {
      expect(result!.balance).toEqual(SAMPLE_BALANCE)
      expect(result!.analyzedAt).toBe(new Date(analyzedAt * 1000).toISOString())
    }
  })

  it('returns offer cached result when record exists within 30 days', async () => {
    const analyzedAt = Math.floor(Date.now() / 1000) - 60
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: { userId: TEST_USER_ID, analyzedAt, type: 'offer', creditOffer: SAMPLE_CREDIT_OFFER },
    })

    const result = await getCachedAnalysis(TEST_USER_ID, TABLE_NAME)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('offer')
    if (result!.type === 'offer') {
      expect(result!.creditOffer).toEqual(SAMPLE_CREDIT_OFFER)
      expect(result!.analyzedAt).toBe(new Date(analyzedAt * 1000).toISOString())
    }
  })

  it('returns null when record exists but is older than 30 days', async () => {
    const expiredTimestamp = Math.floor(Date.now() / 1000) - THIRTY_DAYS_SECONDS - 1
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: { userId: TEST_USER_ID, analyzedAt: expiredTimestamp, type: 'active_credit', balance: SAMPLE_BALANCE },
    })

    const result = await getCachedAnalysis(TEST_USER_ID, TABLE_NAME)
    expect(result).toBeNull()
  })

  it('throws wrapped error when table name is invalid', async () => {
    await expect(getCachedAnalysis(TEST_USER_ID, 'nonexistent-table-xyz')).rejects.toThrow(
      /Error on getCachedAnalysis/
    )
  })
})
