export const TABLE_NAME = process.env.COMPANIES_TABLE_NAME as string

export const TEST_COMPANIES = {
  alpha: {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'Alpha Test Company',
  },
  beta: {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    name: 'Beta Test Company',
  },
} as const
