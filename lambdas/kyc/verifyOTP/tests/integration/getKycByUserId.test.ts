import { NotFoundError } from '../../../../../shared/constants/errors'
import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { getKycByUserId } from '../../services/getKycByUserId'
import { TEST_KYC_RECORD, TEST_USER_ID } from './helpers/constants'

const TABLE_NAME = process.env.KYC_TABLE_NAME as string
const now = Math.floor(Date.now() / 1000)

beforeAll(async () => {
  await dynamoDb.put({
    TableName: TABLE_NAME,
    Item: {
      ...TEST_KYC_RECORD,
      created_at: now,
      expires_at: now + 86400,
    },
  })
})

afterAll(async () => {
  await dynamoDb.delete({
    TableName: TABLE_NAME,
    Key: { creditId: TEST_KYC_RECORD.creditId },
  })
})

describe('getKycByUserId integration', () => {
  it('happy path — returns KYC record for userId', async () => {
    const result = await getKycByUserId(TEST_USER_ID, TABLE_NAME)
    expect(result.creditId).toBe(TEST_KYC_RECORD.creditId)
    expect(result.step).toBe('OTP')
    expect(result.userId).toBe(TEST_USER_ID)
  })

  it('throws NotFoundError when userId has no KYC process', async () => {
    await expect(
      getKycByUserId('non-existent-user-id', TABLE_NAME)
    ).rejects.toThrow(NotFoundError)
  })
})
