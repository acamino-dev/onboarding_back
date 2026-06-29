import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { updateKycWithIneData } from '../../services/updateKycWithIneData'
import { TEST_CREDIT_ID, TEST_INE_DATA, TEST_KYC_RECORD, TEST_RFC, TEST_USER_ID } from './helpers/constants'

const TABLE_NAME = process.env.KYC_TABLE_NAME as string

beforeAll(async () => {
  await dynamoDb.put({
    TableName: TABLE_NAME,
    Item: { ...TEST_KYC_RECORD, created_at: Math.floor(Date.now() / 1000) },
  })
})

afterAll(async () => {
  await dynamoDb.delete({
    TableName: TABLE_NAME,
    Key: { creditId: TEST_KYC_RECORD.creditId },
  })
})

describe('updateKycWithIneData integration', () => {
  it('updates step to INE_BACK and persists INE fields', async () => {
    await updateKycWithIneData(TEST_CREDIT_ID, TEST_INE_DATA, TEST_RFC, TABLE_NAME)

    const result = await dynamoDb.get({
      TableName: TABLE_NAME,
      Key: { creditId: TEST_CREDIT_ID },
    })

    expect(result.Item?.['step']).toBe('INE_BACK')
    expect(result.Item?.['fullName']).toBe(TEST_INE_DATA.nombre)
    expect(result.Item?.['curp']).toBe(TEST_INE_DATA.curp)
    expect(result.Item?.['rfc']).toBe(TEST_RFC)
    expect(result.Item?.['birthDate']).toBe(TEST_INE_DATA.fechaNacimiento)
    expect(result.Item?.['address']).toBe(TEST_INE_DATA.domicilio)
    expect(result.Item?.['neighborhood']).toBeNull()
    expect(result.Item?.['city']).toBeNull()
    expect(result.Item?.['postalCode']).toBeNull()
  })

  it('throws wrapped Error when creditId does not exist', async () => {
    await expect(
      updateKycWithIneData('nonexistent-credit-id', TEST_INE_DATA, TEST_RFC, 'nonexistent-table')
    ).rejects.toThrow(/Error on updateKycWithIneData/)
  })
})
