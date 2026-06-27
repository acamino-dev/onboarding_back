export const CREDIT_HISTORY_REQUESTS_TABLE = 'onboardingCreditHistoryRequestsDBDev'
export const KYC_TABLE = 'onboardingKycDBDev'

export const TEST_OFFER_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567810'
export const TEST_ACTIVE_CREDIT_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567811'
export const TEST_KYC_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567812'

export const TEST_CREDIT_OFFER = {
  score: 80,
  breakdown: {
    creditCount: 20,
    acaminoTenure: 20,
    frequency: 10,
    company: 20,
    laborSeniority: 10,
  },
  offer: {
    amount: 10000,
    rate: 0.05,
    term: 24,
  },
} as const
