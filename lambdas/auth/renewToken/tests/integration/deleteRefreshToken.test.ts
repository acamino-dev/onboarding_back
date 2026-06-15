import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { deleteRefreshToken } from '../../services/deleteRefreshToken'
import { TEST_REFRESH_TOKENS } from './helpers/constants'

const TABLE_NAME = process.env.REFRESH_TOKENS_TABLE_NAME as string

beforeAll(async () => {
  await dynamoDb.put({
    TableName: TABLE_NAME,
    Item: {
      token_hash: TEST_REFRESH_TOKENS.forDelete.token_hash,
      user_id: TEST_REFRESH_TOKENS.forDelete.user_id,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
  })
})

afterAll(async () => {
  await dynamoDb.delete({ TableName: TABLE_NAME, Key: { token_hash: TEST_REFRESH_TOKENS.forDelete.token_hash } })
})

describe('deleteRefreshToken integration', () => {
  it('removes the token from DynamoDB', async () => {
    await deleteRefreshToken(TEST_REFRESH_TOKENS.forDelete.token_hash, TABLE_NAME)

    const result = await dynamoDb.get({
      TableName: TABLE_NAME,
      Key: { token_hash: TEST_REFRESH_TOKENS.forDelete.token_hash },
    })

    expect(result.Item).toBeUndefined()
  })

  it('does not throw when token does not exist', async () => {
    await expect(
      deleteRefreshToken('nonexistent-hash-that-does-not-exist', TABLE_NAME)
    ).resolves.toBeUndefined()
  })

  it('throws wrapped Error when table does not exist', async () => {
    await expect(
      deleteRefreshToken(TEST_REFRESH_TOKENS.forDelete.token_hash, 'nonExistentTable')
    ).rejects.toThrow(/Error on deleteRefreshToken/)
  })
})
