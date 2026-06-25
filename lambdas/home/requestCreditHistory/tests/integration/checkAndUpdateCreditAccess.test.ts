import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { checkAndUpdateCreditAccess } from '../../services/checkAndUpdateCreditAccess'
import { TEST_USER } from './helpers/constants'

const TABLE_NAME = process.env.CREDIT_HISTORY_REQUESTS_TABLE_NAME!
const TEST_USER_ID = TEST_USER.id

afterEach(async () => {
  await dynamoDb.delete({
    TableName: TABLE_NAME,
    Key: { userId: TEST_USER_ID },
  })
})

describe('checkAndUpdateCreditAccess integration', () => {
  it('happy path — allows access when no previous request exists', async () => {
    const result = await checkAndUpdateCreditAccess(TEST_USER_ID, TABLE_NAME)
    expect(result.allowed).toBe(true)
  })

  it('stores lastRequestedAt after first access', async () => {
    await checkAndUpdateCreditAccess(TEST_USER_ID, TABLE_NAME)
    const response = await dynamoDb.get({ TableName: TABLE_NAME, Key: { userId: TEST_USER_ID } })
    expect(response.Item).toBeDefined()
    expect(typeof response.Item!.lastRequestedAt).toBe('number')
  })

  it('denies access when within 30-day cooldown and returns nextAvailableAt', async () => {
    const recentTimestamp = Math.floor(Date.now() / 1000) - 60
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: { userId: TEST_USER_ID, lastRequestedAt: recentTimestamp },
    })

    const result = await checkAndUpdateCreditAccess(TEST_USER_ID, TABLE_NAME)
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      const expectedDate = new Date((recentTimestamp + 30 * 24 * 60 * 60) * 1000).toISOString()
      expect(result.nextAvailableAt).toBe(expectedDate)
    }
  })

  it('allows access when last request was more than 30 days ago', async () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 31 * 24 * 60 * 60
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: { userId: TEST_USER_ID, lastRequestedAt: oldTimestamp },
    })

    const result = await checkAndUpdateCreditAccess(TEST_USER_ID, TABLE_NAME)
    expect(result.allowed).toBe(true)
  })
})
