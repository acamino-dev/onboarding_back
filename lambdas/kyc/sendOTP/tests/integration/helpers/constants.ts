export const KYC_TABLE = 'onboardingKycDBDev'
export const OTP_TABLE = 'onboardingOtpDBDev'

export const TEST_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
export const TEST_CREDIT_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'

export const TEST_KYC_RECORD = {
  creditId: TEST_CREDIT_ID,
  userId: TEST_USER_ID,
  step: 'phone_verification',
  amount: 5000,
  term: 12,
  rate: 0.05,
} as const

export const TEST_PHONE_NUMBER = '5512345678'
