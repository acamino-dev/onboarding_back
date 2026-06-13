export const TEST_OTP_EMAIL = 'verify.otp.test@integrationtest.com'
export const TEST_VERIFIED_USER_EMAIL = 'verify.otp.verified@integrationtest.com'

export const TEST_COMPANY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export const TEST_EMPLOYEES = {
  unverified: {
    id: 'f1e2d3c4-b5a6-7890-1234-abcdef012345',
    employee_number: 'VOTP001',
    rfc: 'VOTA970101AB1',
  },
  verified: {
    id: 'f2e3d4c5-a6b7-8901-2345-bcdef0123456',
    employee_number: 'VOTP002',
    rfc: 'VOTB970101AB1',
  },
} as const

export const TEST_USERS = {
  unverified: { id: 'f3e4d5c6-b7a8-9012-3456-cdef01234567' },
  verified: { id: 'f4e5d6c7-a8b9-0123-4567-def012345678' },
} as const

export const OTP_ITEMS = {
  valid: {
    email: TEST_OTP_EMAIL,
    otp_id: 'c1d2e3f4-a5b6-7890-1234-567890abcdef',
    code: '123456',
  },
  used: {
    email: TEST_OTP_EMAIL,
    otp_id: 'd2e3f4a5-b6c7-8901-2345-678901bcdef0',
    code: '654321',
  },
  expired: {
    email: TEST_OTP_EMAIL,
    otp_id: 'e3f4a5b6-c7d8-9012-3456-789012cdef01',
    code: '999888',
  },
} as const
