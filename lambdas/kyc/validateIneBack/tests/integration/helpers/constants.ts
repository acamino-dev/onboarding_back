export const TEST_USER_ID = 'integration-user-validate-ine-back-001'
export const TEST_CREDIT_ID = 'b3c4d5e6-f7a8-9012-cdef-012345678902'

export const TEST_KYC_RECORD = {
  creditId: TEST_CREDIT_ID,
  userId: TEST_USER_ID,
  step: 'INE_BACK',
  s3Key: 'onboarding/2025/06/27/b3c4d5e6-f7a8-9012-cdef-012345678902/INE_BACK.jpg',
  nombre: 'JUAN PEREZ GARCIA',
  amount: 10000,
  term: 12,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
} as const
