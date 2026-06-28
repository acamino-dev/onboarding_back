import { NotFoundError } from '../../../../../shared/constants/errors'
import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { getKycByUserId } from '../../services/getKycByUserId'
import { READ_KYC_RECORD, READ_USER_ID } from './helpers/constants'

const TABLE_NAME = process.env.KYC_TABLE_NAME as string

beforeAll(async () => {
  await dynamoDb.put({
    TableName: TABLE_NAME,
    Item: { ...READ_KYC_RECORD, created_at: Math.floor(Date.now() / 1000) },
  })
})

afterAll(async () => {
  await dynamoDb.delete({
    TableName: TABLE_NAME,
    Key: { creditId: READ_KYC_RECORD.creditId },
  })
})

describe('getKycByUserId integration', () => {
  it('returns KYC record with s3Key and nombre for existing userId', async () => {
    const result = await getKycByUserId(READ_USER_ID, TABLE_NAME)
    expect(result.creditId).toBe(READ_KYC_RECORD.creditId)
    expect(result.userId).toBe(READ_USER_ID)
    expect(result.step).toBe(READ_KYC_RECORD.step)
    expect(result.s3Key).toBe(READ_KYC_RECORD.s3Key)
    expect(result.nombre).toBe(READ_KYC_RECORD.nombre)
  })

  it('throws NotFoundError when userId has no KYC record', async () => {
    await expect(getKycByUserId('nonexistent-user-id', TABLE_NAME)).rejects.toThrow(NotFoundError)
  })
})
