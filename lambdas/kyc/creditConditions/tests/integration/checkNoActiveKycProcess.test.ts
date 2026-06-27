import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { DuplicatedError } from '../../../../../shared/constants/errors'
import { checkNoActiveKycProcess } from '../../services/checkNoActiveKycProcess'
import { KYC_TABLE, TEST_EXISTING_KYC_USER_ID } from './helpers/constants'
import { KYC_STEPS, KYC_TTL_DAYS } from '../../../../../shared/constants/kyc'

const TTL_SECONDS = KYC_TTL_DAYS * 24 * 60 * 60
const EXISTING_CREDIT_ID = 'test-existing-kyc-credit-id-check'

beforeAll(async () => {
  await dynamoDb.put({
    TableName: KYC_TABLE,
    Item: {
      creditId: EXISTING_CREDIT_ID,
      userId: TEST_EXISTING_KYC_USER_ID,
      step: KYC_STEPS.INE_FRONT,
      amount: 5000,
      term: 12,
      rate: 0.05,
      created_at: Math.floor(Date.now() / 1000),
      expires_at: Math.floor(Date.now() / 1000) + TTL_SECONDS,
    },
  })
})

afterAll(async () => {
  await dynamoDb.delete({
    TableName: KYC_TABLE,
    Key: { creditId: EXISTING_CREDIT_ID },
  })
})

describe('checkNoActiveKycProcess integration', () => {
  it('resolves when user has no active KYC process', async () => {
    await expect(
      checkNoActiveKycProcess('user-with-no-kyc-process', KYC_TABLE)
    ).resolves.toBeUndefined()
  })

  it('throws DuplicatedError when user already has an active KYC process', async () => {
    await expect(
      checkNoActiveKycProcess(TEST_EXISTING_KYC_USER_ID, KYC_TABLE)
    ).rejects.toThrow(DuplicatedError)
  })
})
