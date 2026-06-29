export const TEST_USER_ID = 'integration-user-validate-curp-001'
export const TEST_CREDIT_ID = 'd5e6f7a8-b9c0-1234-ef01-234567890005'

export const TEST_KYC_RECORD = {
  creditId: TEST_CREDIT_ID,
  userId: TEST_USER_ID,
  step: 'CURP',
  s3Key: 'onboarding/2026/06/28/1b187669-a0a0-4f2a-9fff-cf64530ac093/CURP.pdf',
  curp: 'PEGJ970101HMCRRC09',
  amount: 10000,
  term: 12,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
} as const

export const READ_USER_ID = 'integration-user-validate-curp-read-001'
export const READ_CREDIT_ID = 'd5e6f7a8-b9c0-1234-ef01-234567890006'

export const READ_KYC_RECORD = {
  creditId: READ_CREDIT_ID,
  userId: READ_USER_ID,
  step: 'CURP',
  s3Key: 'onboarding/2026/06/28/1b187669-a0a0-4f2a-9fff-cf64530ac093/CURP.pdf',
  curp: 'PEGJ970101HMCRRC09',
  amount: 10000,
  term: 12,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
} as const
