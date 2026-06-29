export const TEST_USER_ID = 'b1a2c3d4-e5f6-7890-abcd-ef1234560001'
export const TEST_CREDIT_ID = 'c1a2b3d4-e5f6-7890-abcd-ef1234560002'

export const TEST_KYC_RECORD = {
  creditId: TEST_CREDIT_ID,
  userId: TEST_USER_ID,
  step: 'BANK',
  s3Keys: { BANK: 'onboarding/test/validateBank/BANK.jpg' },
  fullName: 'GARCIA LOPEZ JUAN CARLOS',
  amount: 10000,
  term: 12,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
} as const
