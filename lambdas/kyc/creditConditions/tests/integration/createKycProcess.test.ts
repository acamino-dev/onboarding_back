import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { createKycProcess } from '../../services/createKycProcess'
import { KYC_TABLE, TEST_KYC_USER_ID } from './helpers/constants'

let createdCreditId: string

afterEach(async () => {
  if (createdCreditId) {
    await dynamoDb.delete({ TableName: KYC_TABLE, Key: { creditId: createdCreditId } })
    createdCreditId = ''
  }
})

describe('createKycProcess integration', () => {
  it('creates KYC process and returns creditId and step CONDITIONS', async () => {
    const result = await createKycProcess(TEST_KYC_USER_ID, 5000, 12, 0.05, KYC_TABLE)
    createdCreditId = result.creditId

    expect(result.step).toBe('INE_FRONT')
    expect(result.creditId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })

  it('persists correct fields in DynamoDB', async () => {
    const result = await createKycProcess(TEST_KYC_USER_ID, 8000, 18, 0.08, KYC_TABLE)
    createdCreditId = result.creditId

    const { Item } = await dynamoDb.get({
      TableName: KYC_TABLE,
      Key: { creditId: result.creditId },
    })

    expect(Item?.userId).toBe(TEST_KYC_USER_ID)
    expect(Item?.amount).toBe(8000)
    expect(Item?.term).toBe(18)
    expect(Item?.rate).toBe(0.08)
    expect(Item?.step).toBe('INE_FRONT')
    expect(Item?.created_at).toBeGreaterThan(0)
  })

  it('does not set expires_at — KYC records never expire', async () => {
    const result = await createKycProcess(TEST_KYC_USER_ID, 3000, 6, 0.05, KYC_TABLE)
    createdCreditId = result.creditId

    const { Item } = await dynamoDb.get({
      TableName: KYC_TABLE,
      Key: { creditId: result.creditId },
    })

    expect(Item?.expires_at).toBeUndefined()
  })
})
