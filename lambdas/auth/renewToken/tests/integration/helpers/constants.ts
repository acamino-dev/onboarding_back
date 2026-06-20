import { SEEDED_USER_ID, TEST_COMPANY_ID, EMPLOYEES } from '../../../../../../scripts/constants'

export { SEEDED_USER_ID, TEST_COMPANY_ID, EMPLOYEES }

export const TEST_REFRESH_TOKENS = {
  active: {
    token_hash: 'd'.repeat(64),
    user_id: SEEDED_USER_ID,
  },
  expired: {
    token_hash: 'e'.repeat(64),
    user_id: SEEDED_USER_ID,
  },
  forDelete: {
    token_hash: 'f'.repeat(64),
    user_id: SEEDED_USER_ID,
  },
} as const
