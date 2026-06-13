export const TEST_RECOVERY_OTP_EMAIL = 'alice.recovery@integrationtest.com'

export const VERIFIED_USER = {
  id: 'c2d3e4f5-a6b7-8901-cdef-012345678902',
  employeeId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
  companyId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: TEST_RECOVERY_OTP_EMAIL,
} as const

export const UNVERIFIED_USER = {
  id: 'd3e4f5a6-b7c8-9012-defa-123456789013',
  employeeId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
  companyId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'alice.unverified@integrationtest.com',
} as const

export const OTP_ITEMS = {
  existing: {
    email: TEST_RECOVERY_OTP_EMAIL,
    otp_id: 'e4f5a6b7-c8d9-0123-efab-234567890124',
  },
} as const
