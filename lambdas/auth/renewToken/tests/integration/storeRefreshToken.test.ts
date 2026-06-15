import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { storeRefreshToken } from '../../services/storeRefreshToken'
import { SEEDED_USER_ID } from './helpers/constants'

const TABLE_NAME = process.env.REFRESH_TOKENS_TABLE_NAME as string
const TEST_TOKEN_HASH = '1'.repeat(64)

afterEach(async () => {
  await dynamoDb.delete({ TableName: TABLE_NAME, Key: { token_hash: TEST_TOKEN_HASH } })
})

describe('storeRefreshToken integration', () => {
  it('inserts token record in DynamoDB with correct fields', async () => {
    const before = Math.floor(Date.now() / 1000)
    await storeRefreshToken(TEST_TOKEN_HASH, SEEDED_USER_ID, TABLE_NAME)

    const result = await dynamoDb.get({
      TableName: TABLE_NAME,
      Key: { token_hash: TEST_TOKEN_HASH },
    })

    expect(result.Item).toBeDefined()
    expect(result.Item?.token_hash).toBe(TEST_TOKEN_HASH)
    expect(result.Item?.user_id).toBe(SEEDED_USER_ID)
    expect(result.Item?.expires_at).toBeGreaterThan(before + 7 * 24 * 60 * 60 - 5)
  })

  it('throws wrapped Error when table does not exist', async () => {
    await expect(
      storeRefreshToken(TEST_TOKEN_HASH, SEEDED_USER_ID, 'nonExistentTable')
    ).rejects.toThrow(/Error on storeRefreshToken/)
  })
})
