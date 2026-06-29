import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { findKycProcess } from '../../services/findKycProcess'
import { TEST_USER_ID, TEST_CREDIT_ID, TEST_KYC_ITEM } from './helpers/constants'

const TABLE_NAME = process.env.KYC_TABLE_NAME as string

beforeAll(async () => {
  await dynamoDb.put({
    TableName: TABLE_NAME,
    Item: {
      ...TEST_KYC_ITEM,
      created_at: Math.floor(Date.now() / 1000),
    },
  })
})

afterAll(async () => {
  await dynamoDb.delete({
    TableName: TABLE_NAME,
    Key: { creditId: TEST_CREDIT_ID },
  })
})

describe('findKycProcess integration', () => {
  it('returns KYC process when userId exists', async () => {
    const result = await findKycProcess(TEST_USER_ID, TABLE_NAME)
    expect(result).not.toBeNull()
    expect(result?.creditId).toBe(TEST_CREDIT_ID)
    expect(result?.userId).toBe(TEST_USER_ID)
    expect(result?.step).toBe('CONDITIONS')
    expect(result?.amount).toBe(10000)
    expect(result?.fullName).toBe('Juan García López')
    expect(result?.rfc).toBeNull()
    expect(result?.birthDate).toBeNull()
    expect(result?.address).toBeNull()
    expect(result?.bankAccount).toBeNull()
  })

  it('returns null when userId has no KYC process', async () => {
    const result = await findKycProcess('non-existent-user-00000000', TABLE_NAME)
    expect(result).toBeNull()
  })
})
