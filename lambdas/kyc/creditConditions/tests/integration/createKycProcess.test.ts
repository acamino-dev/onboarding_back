import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { createKycProcess } from '../../services/createKycProcess'
import { KYC_TABLE, TEST_KYC_USER_ID } from './helpers/constants'
import { KYC_TTL_DAYS } from '../../../../../shared/constants/kyc'

const TTL_SECONDS = KYC_TTL_DAYS * 24 * 60 * 60

let createdCreditId: string

afterEach(async () => {
  if (createdCreditId) {
    await dynamoDb.delete({ TableName: KYC_TABLE, Key: { creditId: createdCreditId } })
    createdCreditId = ''
  }
})

describe('createKycProcess integration', () => {
  it('creates KYC process and returns creditId and step CONDITIONS', async () => {
    const result = await createKycProcess(TEST_KYC_USER_ID, 5000, 12, KYC_TABLE)
    createdCreditId = result.creditId

    expect(result.step).toBe('CONDITIONS')
    expect(result.creditId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })

  it('persists correct fields in DynamoDB', async () => {
    const result = await createKycProcess(TEST_KYC_USER_ID, 8000, 18, KYC_TABLE)
    createdCreditId = result.creditId

    const { Item } = await dynamoDb.get({
      TableName: KYC_TABLE,
      Key: { creditId: result.creditId },
    })

    expect(Item?.userId).toBe(TEST_KYC_USER_ID)
    expect(Item?.amount).toBe(8000)
    expect(Item?.term).toBe(18)
    expect(Item?.step).toBe('CONDITIONS')
    expect(Item?.created_at).toBeGreaterThan(0)
  })

  it('sets TTL approximately 15 days from creation', async () => {
    const before = Math.floor(Date.now() / 1000)
    const result = await createKycProcess(TEST_KYC_USER_ID, 3000, 6, KYC_TABLE)
    createdCreditId = result.creditId
    const after = Math.floor(Date.now() / 1000)

    const { Item } = await dynamoDb.get({
      TableName: KYC_TABLE,
      Key: { creditId: result.creditId },
    })

    expect(Item?.expires_at).toBeGreaterThanOrEqual(before + TTL_SECONDS)
    expect(Item?.expires_at).toBeLessThanOrEqual(after + TTL_SECONDS)
  })
})
