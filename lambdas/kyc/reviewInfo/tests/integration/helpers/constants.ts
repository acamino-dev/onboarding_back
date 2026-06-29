export const KYC_TABLE_NAME = process.env.KYC_TABLE_NAME ?? 'onboardingKycDBDev'

export const TEST_KYC_RECORD = {
  creditId: 'f47ac10b-58cc-4372-a567-review-info01',
  userId: 'f47ac10b-58cc-4372-a567-review-info02',
  step: 'REVIEW',
  amount: 15000,
  term: 12,
} as const
