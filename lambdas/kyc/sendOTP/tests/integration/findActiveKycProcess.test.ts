import { NotFoundError } from '../../../../../shared/constants/errors'
import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { findActiveKycProcess } from '../../services/findActiveKycProcess'
import { KYC_TABLE, TEST_KYC_RECORD, TEST_USER_ID, TEST_CREDIT_ID } from './helpers/constants'

beforeAll(async () => {
  await dynamoDb.put({
    TableName: KYC_TABLE,
    Item: { ...TEST_KYC_RECORD, created_at: Math.floor(Date.now() / 1000) },
  })
})

afterAll(async () => {
  await dynamoDb.delete({
    TableName: KYC_TABLE,
    Key: { creditId: TEST_CREDIT_ID },
  })
})

describe('findActiveKycProcess integration', () => {
  it('returns creditId for existing KYC process', async () => {
    const result = await findActiveKycProcess(TEST_USER_ID, KYC_TABLE)
    expect(result.creditId).toBe(TEST_CREDIT_ID)
  })

  it('throws NotFoundError when no KYC process exists for userId', async () => {
    await expect(
      findActiveKycProcess('non-existent-user-id', KYC_TABLE)
    ).rejects.toThrow(NotFoundError)
  })
})
