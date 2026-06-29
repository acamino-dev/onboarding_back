import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { updateKycWithBankData } from '../../services/updateKycWithBankData'
import { TEST_CREDIT_ID, TEST_KYC_RECORD } from './helpers/constants'

const TABLE_NAME = process.env.KYC_TABLE_NAME as string

beforeAll(async () => {
  await dynamoDb.put({
    TableName: TABLE_NAME,
    Item: { ...TEST_KYC_RECORD, created_at: Math.floor(Date.now() / 1000) },
  })
})

afterAll(async () => {
  await Promise.all([
    dynamoDb.delete({ TableName: TABLE_NAME, Key: { creditId: TEST_CREDIT_ID } }),
    dynamoDb.delete({ TableName: TABLE_NAME, Key: { creditId: 'nonexistent-credit-id' } }),
  ])
})

describe('updateKycWithBankData integration', () => {
  it('updates accountNumber and advances step to OTP', async () => {
    const accountNumber = '012345678901234567'

    await updateKycWithBankData(TEST_CREDIT_ID, accountNumber, TABLE_NAME)

    const result = await dynamoDb.get({
      TableName: TABLE_NAME,
      Key: { creditId: TEST_CREDIT_ID },
    })

    expect(result.Item?.['step']).toBe('OTP')
    expect(result.Item?.['accountNumber']).toBe(accountNumber)
  })

  it('throws wrapped Error when creditId does not exist', async () => {
    await expect(
      updateKycWithBankData('nonexistent-credit-id', '0000000000', TABLE_NAME)
    ).rejects.toThrow(/Error on updateKycWithBankData/)
  })
})
