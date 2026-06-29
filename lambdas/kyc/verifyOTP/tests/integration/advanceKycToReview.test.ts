import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { advanceKycToReview } from '../../services/advanceKycToReview'
import { TEST_ADVANCE_KYC_RECORD, TEST_PHONE_NUMBER } from './helpers/constants'

const TABLE_NAME = process.env.KYC_TABLE_NAME as string
const now = Math.floor(Date.now() / 1000)

beforeAll(async () => {
  await dynamoDb.put({
    TableName: TABLE_NAME,
    Item: {
      ...TEST_ADVANCE_KYC_RECORD,
      created_at: now,
      expires_at: now + 86400,
    },
  })
})

afterAll(async () => {
  await dynamoDb.delete({
    TableName: TABLE_NAME,
    Key: { creditId: TEST_ADVANCE_KYC_RECORD.creditId },
  })
})

describe('advanceKycToReview integration', () => {
  it('happy path — updates step to REVIEW and saves phoneNumber', async () => {
    await expect(
      advanceKycToReview(TEST_ADVANCE_KYC_RECORD.creditId, TEST_PHONE_NUMBER, TABLE_NAME)
    ).resolves.toBeUndefined()

    const result = await dynamoDb.get({
      TableName: TABLE_NAME,
      Key: { creditId: TEST_ADVANCE_KYC_RECORD.creditId },
    })
    expect(result.Item?.['step']).toBe('REVIEW')
    expect(result.Item?.['phoneNumber']).toBe(TEST_PHONE_NUMBER)
  })

  it('throws wrapped Error when creditId does not exist', async () => {
    await expect(
      advanceKycToReview('non-existent-credit-id-xyz', TEST_PHONE_NUMBER, TABLE_NAME)
    ).rejects.toThrow(/Error on advanceKycToReview/)
  })
})
