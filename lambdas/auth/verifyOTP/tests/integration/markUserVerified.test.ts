import { getDb } from '../../../../../shared/db/client'
import { markUserVerified } from '../../services/markUserVerified'
import { TEST_COMPANY_ID, TEST_EMPLOYEES, TEST_OTP_EMAIL, TEST_USERS } from './helpers/constants'

const PASSWORD_HASH_PLACEHOLDER = '$2b$10$placeholder.hash.for.integration.tests.only'

beforeAll(async () => {
  const db = await getDb()
  await db.query(
    'INSERT INTO employees (id, employee_number, rfc, company_id, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
    [TEST_EMPLOYEES.unverified.id, TEST_EMPLOYEES.unverified.employee_number, TEST_EMPLOYEES.unverified.rfc, TEST_COMPANY_ID, true]
  )
  await db.query(
    'INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
    [TEST_USERS.unverified.id, TEST_EMPLOYEES.unverified.id, TEST_COMPANY_ID, TEST_OTP_EMAIL, PASSWORD_HASH_PLACEHOLDER, false]
  )
})

afterAll(async () => {
  const db = await getDb()
  await db.query('DELETE FROM users WHERE id = $1', [TEST_USERS.unverified.id])
  await db.query('DELETE FROM employees WHERE id = $1', [TEST_EMPLOYEES.unverified.id])
})

describe('markUserVerified integration', () => {
  afterEach(async () => {
    const db = await getDb()
    await db.query('UPDATE users SET otp_verified = FALSE, updated_at = NOW() WHERE email = $1', [
      TEST_OTP_EMAIL,
    ])
  })

  it('happy path — sets otp_verified to true for the given email', async () => {
    await markUserVerified(TEST_OTP_EMAIL)

    const db = await getDb()
    const user = await db.queryOne<{ otp_verified: boolean }>(
      'SELECT otp_verified FROM users WHERE email = $1',
      [TEST_OTP_EMAIL]
    )
    expect(user?.otp_verified).toBe(true)
  })
})
