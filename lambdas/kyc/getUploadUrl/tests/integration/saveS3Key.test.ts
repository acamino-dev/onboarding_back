import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { saveS3Key } from '../../services/saveS3Key'
import { TEST_KYC_RECORD, TEST_CREDIT_ID } from './helpers/constants'

const TABLE_NAME = process.env.KYC_TABLE_NAME as string
const TEST_STEP = 'INE_FRONT'
const TEST_S3_KEY = 'onboarding/2026/06/27/integration-test-credit/INE_FRONT.jpg'

beforeAll(async () => {
  await dynamoDb.put({
    TableName: TABLE_NAME,
    Item: { ...TEST_KYC_RECORD, created_at: Math.floor(Date.now() / 1000) },
  })
})

afterAll(async () => {
  await dynamoDb.delete({
    TableName: TABLE_NAME,
    Key: { creditId: TEST_CREDIT_ID },
  })
})

describe('saveS3Key integration', () => {
  it('persists s3Key in s3Keys map on the KYC record', async () => {
    await saveS3Key(TEST_CREDIT_ID, TEST_STEP, TEST_S3_KEY, TABLE_NAME)

    const result = await dynamoDb.get({
      TableName: TABLE_NAME,
      Key: { creditId: TEST_CREDIT_ID },
    })

    expect(result.Item?.['s3Keys']?.[TEST_STEP]).toBe(TEST_S3_KEY)
  })

  it('throws when table name is invalid', async () => {
    await expect(saveS3Key(TEST_CREDIT_ID, TEST_STEP, TEST_S3_KEY, 'nonexistent-table')).rejects.toThrow(
      /Error on saveS3Key/
    )
  })
})
