import { SEEDED_USER_ID, TEST_COMPANY_ID } from '../../../../../../scripts/constants'

export { SEEDED_USER_ID, TEST_COMPANY_ID }

export const TEST_REFRESH_TOKENS = {
  active: {
    token_hash: 'b'.repeat(64),
    user_id: SEEDED_USER_ID,
  },
  expired: {
    token_hash: 'c'.repeat(64),
    user_id: SEEDED_USER_ID,
  },
} as const
