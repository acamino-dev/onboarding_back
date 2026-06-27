import { NotFoundError } from '../../../../../shared/constants/errors'
import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { getKycByUserId } from '../../services/getKycByUserId'
import { TEST_KYC_RECORD, TEST_USER_ID } from './helpers/constants'

const TABLE_NAME = process.env.KYC_TABLE_NAME as string

beforeAll(async () => {
  await dynamoDb.put({
    TableName: TABLE_NAME,
    Item: { ...TEST_KYC_RECORD, created_at: Math.floor(Date.now() / 1000) },
  })
})

afterAll(async () => {
  await dynamoDb.delete({
    TableName: TABLE_NAME,
    Key: { creditId: TEST_KYC_RECORD.creditId },
  })
})

describe('getKycByUserId integration', () => {
  it('returns KYC record with s3Key for existing userId', async () => {
    const result = await getKycByUserId(TEST_USER_ID, TABLE_NAME)
    expect(result.creditId).toBe(TEST_KYC_RECORD.creditId)
    expect(result.userId).toBe(TEST_USER_ID)
    expect(result.step).toBe(TEST_KYC_RECORD.step)
    expect(result.s3Key).toBe(TEST_KYC_RECORD.s3Key)
  })

  it('throws NotFoundError when userId has no KYC record', async () => {
    await expect(getKycByUserId('nonexistent-user-id', TABLE_NAME)).rejects.toThrow(NotFoundError)
  })
})
