import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { updateKycStep } from '../../services/updateKycStep'
import { TEST_CREDIT_ID, TEST_KYC_RECORD } from './helpers/constants'

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

describe('updateKycStep integration', () => {
  it('updates step to BANK', async () => {
    await updateKycStep(TEST_CREDIT_ID, 'BANK', TABLE_NAME)

    const result = await dynamoDb.get({
      TableName: TABLE_NAME,
      Key: { creditId: TEST_CREDIT_ID },
    })

    expect(result.Item?.['step']).toBe('BANK')
  })

  it('throws wrapped Error when table does not exist', async () => {
    await expect(
      updateKycStep(TEST_CREDIT_ID, 'BANK', 'nonexistent-table')
    ).rejects.toThrow(/Error on updateKycStep/)
  })
})
