import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { saveKycReviewInfo } from '../../services/saveKycReviewInfo'
import type { RequestBody } from '../../types/RequestBody'
import { KYC_TABLE_NAME, TEST_KYC_RECORD } from './helpers/constants'

const validBody: RequestBody = {
  clabe: '032180000118359719',
  references: [
    { relation: 'Hermano', fullName: 'Carlos Ramirez', phoneNumber: '5512345678' },
    { relation: 'Amigo', fullName: 'Ana Lopez', phoneNumber: '5598765432' },
  ],
}

beforeAll(async () => {
  await dynamoDb.put({
    TableName: KYC_TABLE_NAME,
    Item: {
      ...TEST_KYC_RECORD,
      created_at: Math.floor(Date.now() / 1000),
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    },
  })
})

afterAll(async () => {
  await dynamoDb.delete({
    TableName: KYC_TABLE_NAME,
    Key: { creditId: TEST_KYC_RECORD.creditId },
  })
})

describe('saveKycReviewInfo integration', () => {
  it('saves clabe and references and advances step to STATUS', async () => {
    await saveKycReviewInfo(TEST_KYC_RECORD.creditId, validBody, KYC_TABLE_NAME)

    const result = await dynamoDb.get({
      TableName: KYC_TABLE_NAME,
      Key: { creditId: TEST_KYC_RECORD.creditId },
    })

    expect(result.Item?.step).toBe('STATUS')
    expect(result.Item?.clabe).toBe('032180000118359719')
    expect(result.Item?.references).toHaveLength(2)
    expect(result.Item?.references[0].relation).toBe('Hermano')
    expect(result.Item?.references[1].relation).toBe('Amigo')
  })

  it('throws wrapped Error when creditId does not exist', async () => {
    await expect(
      saveKycReviewInfo('non-existent-credit-id-xyz', validBody, KYC_TABLE_NAME)
    ).rejects.toThrow(/Error on saveKycReviewInfo/)
  })
})
