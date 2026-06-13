import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { storeRefreshToken } from '../../services/storeRefreshToken'
import { SEEDED_USER_ID, TEST_TOKEN_HASH } from './helpers/constants'

const TABLE_NAME = process.env.REFRESH_TOKENS_TABLE_NAME as string

afterEach(async () => {
  await dynamoDb.delete({
    TableName: TABLE_NAME,
    Key: { token_hash: TEST_TOKEN_HASH },
  })
})

describe('storeRefreshToken integration', () => {
  it('stores the hashed token in DynamoDB with a 7-day TTL', async () => {
    const beforeCall = Math.floor(Date.now() / 1000)
    await storeRefreshToken(TEST_TOKEN_HASH, SEEDED_USER_ID, TABLE_NAME)

    const result = await dynamoDb.get({
      TableName: TABLE_NAME,
      Key: { token_hash: TEST_TOKEN_HASH },
    })

    expect(result.Item).toBeDefined()
    expect(result.Item?.token_hash).toBe(TEST_TOKEN_HASH)
    expect(result.Item?.user_id).toBe(SEEDED_USER_ID)

    const sevenDays = 7 * 24 * 60 * 60
    expect(result.Item?.expires_at).toBeGreaterThanOrEqual(beforeCall + sevenDays)
    expect(result.Item?.expires_at).toBeLessThanOrEqual(beforeCall + sevenDays + 5)
  })

  it('throws wrapped Error when table does not exist', async () => {
    await expect(
      storeRefreshToken(TEST_TOKEN_HASH, SEEDED_USER_ID, 'nonExistentTable')
    ).rejects.toThrow(/Error on storeRefreshToken/)
  })
})
