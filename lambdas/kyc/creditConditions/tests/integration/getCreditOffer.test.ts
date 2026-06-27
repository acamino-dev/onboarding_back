import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { NotFoundError, ForbiddenError } from '../../../../../shared/constants/errors'
import { getCreditOffer } from '../../services/getCreditOffer'
import {
  CREDIT_HISTORY_REQUESTS_TABLE,
  TEST_OFFER_USER_ID,
  TEST_ACTIVE_CREDIT_USER_ID,
  TEST_CREDIT_OFFER,
} from './helpers/constants'

beforeAll(async () => {
  await Promise.all([
    dynamoDb.put({
      TableName: CREDIT_HISTORY_REQUESTS_TABLE,
      Item: {
        userId: TEST_OFFER_USER_ID,
        analyzedAt: Math.floor(Date.now() / 1000),
        type: 'offer',
        creditOffer: TEST_CREDIT_OFFER,
      },
    }),
    dynamoDb.put({
      TableName: CREDIT_HISTORY_REQUESTS_TABLE,
      Item: {
        userId: TEST_ACTIVE_CREDIT_USER_ID,
        analyzedAt: Math.floor(Date.now() / 1000),
        type: 'active_credit',
        balance: [],
      },
    }),
  ])
})

afterAll(async () => {
  await Promise.all([
    dynamoDb.delete({
      TableName: CREDIT_HISTORY_REQUESTS_TABLE,
      Key: { userId: TEST_OFFER_USER_ID },
    }),
    dynamoDb.delete({
      TableName: CREDIT_HISTORY_REQUESTS_TABLE,
      Key: { userId: TEST_ACTIVE_CREDIT_USER_ID },
    }),
  ])
})

describe('getCreditOffer integration', () => {
  it('returns credit offer for user with type offer', async () => {
    const result = await getCreditOffer(TEST_OFFER_USER_ID, CREDIT_HISTORY_REQUESTS_TABLE)
    expect(result.amount).toBe(TEST_CREDIT_OFFER.offer.amount)
    expect(result.rate).toBe(TEST_CREDIT_OFFER.offer.rate)
    expect(result.term).toBe(TEST_CREDIT_OFFER.offer.term)
  })

  it('throws NotFoundError when userId has no credit analysis', async () => {
    await expect(
      getCreditOffer('nonexistent-user-id', CREDIT_HISTORY_REQUESTS_TABLE)
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when user has an active credit', async () => {
    await expect(
      getCreditOffer(TEST_ACTIVE_CREDIT_USER_ID, CREDIT_HISTORY_REQUESTS_TABLE)
    ).rejects.toThrow(ForbiddenError)
  })
})
