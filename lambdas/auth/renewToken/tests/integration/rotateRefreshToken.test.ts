import { AuthError } from '../../../../../shared/constants/errors'
import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { rotateRefreshToken } from '../../services/rotateRefreshToken'
import { SEEDED_USER_ID } from './helpers/constants'

const TABLE_NAME = process.env.REFRESH_TOKENS_TABLE_NAME as string
const OLD_TOKEN_HASH = 'a'.repeat(64)
const NEW_TOKEN_HASH = 'b'.repeat(64)

beforeEach(async () => {
  await dynamoDb.put({
    TableName: TABLE_NAME,
    Item: {
      token_hash: OLD_TOKEN_HASH,
      user_id: SEEDED_USER_ID,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
  })
})

afterEach(async () => {
  await Promise.all([
    dynamoDb.delete({ TableName: TABLE_NAME, Key: { token_hash: OLD_TOKEN_HASH } }),
    dynamoDb.delete({ TableName: TABLE_NAME, Key: { token_hash: NEW_TOKEN_HASH } }),
  ])
})

describe('rotateRefreshToken integration', () => {
  it('deletes old token and inserts new token atomically', async () => {
    const before = Math.floor(Date.now() / 1000)
    await rotateRefreshToken(OLD_TOKEN_HASH, NEW_TOKEN_HASH, SEEDED_USER_ID, TABLE_NAME)

    const [oldResult, newResult] = await Promise.all([
      dynamoDb.get({ TableName: TABLE_NAME, Key: { token_hash: OLD_TOKEN_HASH } }),
      dynamoDb.get({ TableName: TABLE_NAME, Key: { token_hash: NEW_TOKEN_HASH } }),
    ])

    expect(oldResult.Item).toBeUndefined()
    expect(newResult.Item).toBeDefined()
    expect(newResult.Item?.token_hash).toBe(NEW_TOKEN_HASH)
    expect(newResult.Item?.user_id).toBe(SEEDED_USER_ID)
    expect(newResult.Item?.expires_at).toBeGreaterThan(before + 7 * 24 * 60 * 60 - 5)
  })

  it('throws AuthError and leaves no new token when old token is already consumed', async () => {
    await dynamoDb.delete({ TableName: TABLE_NAME, Key: { token_hash: OLD_TOKEN_HASH } })

    await expect(
      rotateRefreshToken(OLD_TOKEN_HASH, NEW_TOKEN_HASH, SEEDED_USER_ID, TABLE_NAME)
    ).rejects.toThrow(AuthError)

    const newResult = await dynamoDb.get({ TableName: TABLE_NAME, Key: { token_hash: NEW_TOKEN_HASH } })
    expect(newResult.Item).toBeUndefined()
  })

  it('throws wrapped Error when table does not exist', async () => {
    await expect(
      rotateRefreshToken(OLD_TOKEN_HASH, NEW_TOKEN_HASH, SEEDED_USER_ID, 'nonExistentTable')
    ).rejects.toThrow(/Error on rotateRefreshToken/)
  })
})
