export const TEST_USER_ID = 'a1b2c3d4-0001-4000-8000-verify-otp-usr'
export const TEST_CREDIT_ID = 'a1b2c3d4-0002-4000-8000-verify-otp-crd'
export const TEST_ADVANCE_CREDIT_ID = 'a1b2c3d4-0005-4000-8000-verify-otp-adv'

export const TEST_KYC_RECORD = {
  creditId: TEST_CREDIT_ID,
  userId: TEST_USER_ID,
  step: 'OTP',
  amount: 10000,
  term: 6,
} as const

export const TEST_ADVANCE_KYC_RECORD = {
  creditId: TEST_ADVANCE_CREDIT_ID,
  userId: 'a1b2c3d4-0006-4000-8000-verify-otp-au2',
  step: 'OTP',
  amount: 10000,
  term: 6,
} as const

export const TEST_PHONE_NUMBER = '5512345678'

export const TEST_OTP = {
  email: TEST_CREDIT_ID,
  otp_id: 'a1b2c3d4-0003-4000-8000-verify-otp-otp',
  code: '7531',
  phoneNumber: TEST_PHONE_NUMBER,
  used: false,
} as const

export const TEST_OTP_EXPIRED = {
  email: TEST_CREDIT_ID,
  otp_id: 'a1b2c3d4-0004-4000-8000-verify-otp-exp',
  code: '9999',
  phoneNumber: TEST_PHONE_NUMBER,
  used: false,
} as const
