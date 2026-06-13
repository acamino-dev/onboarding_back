import { EMPLOYEES, SEEDED_USER_ID, TEST_COMPANY_ID } from '../../../../../../scripts/constants'

export { TEST_COMPANY_ID, SEEDED_USER_ID }

export const LOGIN_USER = {
  id: SEEDED_USER_ID,
  employeeId: EMPLOYEES.withUser.id,
  companyId: TEST_COMPANY_ID,
  email: EMPLOYEES.withUser.email,
  // bcrypt hash of 'IntegrationPass123!' — pre-computed to avoid bcrypt in test setup
  passwordHash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
}

export const TEST_TOKEN_HASH = 'a'.repeat(64)
