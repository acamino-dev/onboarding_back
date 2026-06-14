export const TEST_COMPANY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export const TEST_EMPLOYEE = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  employee_number: 'EMP-RESET-001',
  rfc: 'RSET900101ABC',
  company_id: TEST_COMPANY_ID,
} as const

export const TEST_USER = {
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  employee_id: TEST_EMPLOYEE.id,
  company_id: TEST_COMPANY_ID,
  email: 'reset.password@company.com',
  password_hash: '$2b$10$placeholder.hash.for.integration.tests.only',
  otp_verified: true,
} as const

export const TEST_OTP = {
  email: TEST_USER.email,
  otp_id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
  code: '739201',
} as const
