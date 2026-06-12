export const TEST_OTP_EMAIL = 'bob.smith@integrationtest.com'
export const SEEDED_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18'

export const VERIFIED_USER = {
  id: 'b1c2d3e4-f5a6-7890-abcd-ef0123456789',
  employeeId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
  companyId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'verified.user@integrationtest.com',
} as const

export const OTP_ITEMS = {
  existing: {
    email: TEST_OTP_EMAIL,
    otp_id: 'f1e2d3c4-b5a6-7890-1234-567890abcdef',
  },
} as const
