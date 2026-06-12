import { dynamoDb } from '../../../../../shared/db/dynamodb'
import { scanCompanies } from '../../services/scanCompanies'
import { TEST_COMPANIES, TABLE_NAME } from './helpers/constants'

beforeAll(async () => {
  await Promise.all(
    Object.values(TEST_COMPANIES).map((company) =>
      dynamoDb.put({
        TableName: TABLE_NAME,
        Item: { ...company, created_at: Math.floor(Date.now() / 1000) },
      })
    )
  )
})

afterAll(async () => {
  await Promise.all(
    Object.values(TEST_COMPANIES).map((company) =>
      dynamoDb.delete({
        TableName: TABLE_NAME,
        Key: { id: company.id },
      })
    )
  )
})

describe('scanCompanies integration', () => {
  it('returns all companies including seeded ones', async () => {
    const result = await scanCompanies(TABLE_NAME)
    expect(Array.isArray(result)).toBe(true)
    for (const company of Object.values(TEST_COMPANIES)) {
      const found = result.find((c) => c.id === company.id)
      expect(found).toBeDefined()
      expect(found?.name).toBe(company.name)
    }
  })

  it('returns companies without created_at field', async () => {
    const result = await scanCompanies(TABLE_NAME)
    for (const item of result) {
      expect(item).not.toHaveProperty('created_at')
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
    }
  })
})
