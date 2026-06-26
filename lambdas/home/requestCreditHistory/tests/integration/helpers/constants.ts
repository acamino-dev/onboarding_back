export const TEST_COMPANY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export const TEST_EMPLOYEE = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  employee_number: 'EMP-TEST-001',
  rfc: 'RIRA950505SVA',
  company_id: TEST_COMPANY_ID,
  is_active: true,
} as const

export const TEST_USER = {
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  employee_id: TEST_EMPLOYEE.id,
  company_id: TEST_COMPANY_ID,
  email: 'test.credit@test.com',
} as const

export const TEST_USER_OTHER_RFC = {
  id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
  employee_id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
  company_id: TEST_COMPANY_ID,
  email: 'other.credit@test.com',
  rfc: 'AAAA860519AAA',
} as const

export const TEST_DYNAMO_GET_CACHED_ID = 'f1a2b3c4-d5e6-7890-abcd-ef1234567891'
export const TEST_DYNAMO_STORE_ID = 'f1a2b3c4-d5e6-7890-abcd-ef1234567892'

// RFC with valid format but no records in the portal — always returns history: false
export const TEST_RFC_NO_HISTORY = 'XXXX000000XXX'
