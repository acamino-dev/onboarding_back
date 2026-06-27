export const TEST_USER_ID = 'integration-user-upload-001'
export const TEST_CREDIT_ID = 'c1a2b3d4-e5f6-7890-abcd-ef1234567890'

export const TEST_KYC_RECORD = {
  creditId: TEST_CREDIT_ID,
  userId: TEST_USER_ID,
  step: 'INE_FRONT',
  amount: 15000,
  term: 24,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
} as const
