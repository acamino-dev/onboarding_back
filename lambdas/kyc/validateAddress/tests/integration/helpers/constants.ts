export const TEST_USER_ID = 'integration-user-validate-address-001'
export const TEST_CREDIT_ID = 'c4d5e6f7-a8b9-0123-def0-123456789003'

export const TEST_KYC_RECORD = {
  creditId: TEST_CREDIT_ID,
  userId: TEST_USER_ID,
  step: 'ADDRESS',
  s3Keys: { ADDRESS: 'onboarding/2025/06/28/c4d5e6f7-a8b9-0123-def0-123456789003/ADDRESS.jpg' },
  address: 'CALLE HIDALGO 123 COL CENTRO MONTERREY NL',
  amount: 10000,
  term: 12,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
} as const

export const READ_USER_ID = 'integration-user-validate-address-read-001'
export const READ_CREDIT_ID = 'c4d5e6f7-a8b9-0123-def0-123456789004'

export const READ_KYC_RECORD = {
  creditId: READ_CREDIT_ID,
  userId: READ_USER_ID,
  step: 'ADDRESS',
  s3Keys: { ADDRESS: 'onboarding/2025/06/28/c4d5e6f7-a8b9-0123-def0-123456789004/ADDRESS.jpg' },
  address: 'CALLE HIDALGO 123 COL CENTRO MONTERREY NL',
  amount: 10000,
  term: 12,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
} as const
