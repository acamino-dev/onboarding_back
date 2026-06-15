import { AuthError } from '../../../../../shared/constants/errors'
import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { findRefreshToken } from '../../services/findRefreshToken'
import { TEST_REFRESH_TOKENS } from './helpers/constants'

const TABLE_NAME = process.env.REFRESH_TOKENS_TABLE_NAME as string

beforeAll(async () => {
  await Promise.all([
    dynamoDb.put({
      TableName: TABLE_NAME,
      Item: {
        token_hash: TEST_REFRESH_TOKENS.active.token_hash,
        user_id: TEST_REFRESH_TOKENS.active.user_id,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      },
    }),
    dynamoDb.put({
      TableName: TABLE_NAME,
      Item: {
        token_hash: TEST_REFRESH_TOKENS.expired.token_hash,
        user_id: TEST_REFRESH_TOKENS.expired.user_id,
        expires_at: Math.floor(Date.now() / 1000) - 3600,
      },
    }),
  ])
})

afterAll(async () => {
  await Promise.all([
    dynamoDb.delete({ TableName: TABLE_NAME, Key: { token_hash: TEST_REFRESH_TOKENS.active.token_hash } }),
    dynamoDb.delete({ TableName: TABLE_NAME, Key: { token_hash: TEST_REFRESH_TOKENS.expired.token_hash } }),
  ])
})

describe('findRefreshToken integration', () => {
  it('returns the token record when it exists and is not expired', async () => {
    const result = await findRefreshToken(TEST_REFRESH_TOKENS.active.token_hash, TABLE_NAME)
    expect(result.token_hash).toBe(TEST_REFRESH_TOKENS.active.token_hash)
    expect(result.user_id).toBe(TEST_REFRESH_TOKENS.active.user_id)
  })

  it('throws AuthError when token does not exist', async () => {
    await expect(
      findRefreshToken('nonexistent-hash-that-does-not-exist-in-db', TABLE_NAME)
    ).rejects.toThrow(AuthError)
  })

  it('throws AuthError when token is expired', async () => {
    await expect(
      findRefreshToken(TEST_REFRESH_TOKENS.expired.token_hash, TABLE_NAME)
    ).rejects.toThrow(AuthError)
  })

  it('throws wrapped Error when table does not exist', async () => {
    await expect(
      findRefreshToken(TEST_REFRESH_TOKENS.active.token_hash, 'nonExistentTable')
    ).rejects.toThrow(/Error on findRefreshToken/)
  })
})
