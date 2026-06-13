import { DuplicatedError, NotFoundError } from '../../../../../shared/constants/errors'
import { getDb } from '../../../../../shared/db/client'
import { findUserByEmail } from '../../services/findUserByEmail'
import {
  TEST_COMPANY_ID,
  TEST_EMPLOYEES,
  TEST_OTP_EMAIL,
  TEST_USERS,
  TEST_VERIFIED_USER_EMAIL,
} from './helpers/constants'

const PASSWORD_HASH_PLACEHOLDER = '$2b$10$placeholder.hash.for.integration.tests.only'

beforeAll(async () => {
  const db = await getDb()
  await db.query(
    'INSERT INTO employees (id, employee_number, rfc, company_id, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
    [TEST_EMPLOYEES.unverified.id, TEST_EMPLOYEES.unverified.employee_number, TEST_EMPLOYEES.unverified.rfc, TEST_COMPANY_ID, true]
  )
  await db.query(
    'INSERT INTO employees (id, employee_number, rfc, company_id, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
    [TEST_EMPLOYEES.verified.id, TEST_EMPLOYEES.verified.employee_number, TEST_EMPLOYEES.verified.rfc, TEST_COMPANY_ID, true]
  )
  await db.query(
    'INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
    [TEST_USERS.unverified.id, TEST_EMPLOYEES.unverified.id, TEST_COMPANY_ID, TEST_OTP_EMAIL, PASSWORD_HASH_PLACEHOLDER, false]
  )
  await db.query(
    'INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
    [TEST_USERS.verified.id, TEST_EMPLOYEES.verified.id, TEST_COMPANY_ID, TEST_VERIFIED_USER_EMAIL, PASSWORD_HASH_PLACEHOLDER, true]
  )
})

afterAll(async () => {
  const db = await getDb()
  await db.query('DELETE FROM users WHERE id = ANY($1)', [[TEST_USERS.unverified.id, TEST_USERS.verified.id]])
  await db.query('DELETE FROM employees WHERE id = ANY($1)', [[TEST_EMPLOYEES.unverified.id, TEST_EMPLOYEES.verified.id]])
})

describe('findUserByEmail integration', () => {
  it('happy path — returns user when found and not yet verified', async () => {
    const user = await findUserByEmail(TEST_OTP_EMAIL)
    expect(user.email).toBe(TEST_OTP_EMAIL)
    expect(user.otp_verified).toBe(false)
  })

  it('throws NotFoundError when user does not exist', async () => {
    await expect(findUserByEmail('nonexistent@integrationtest.com')).rejects.toThrow(NotFoundError)
  })

  it('throws DuplicatedError when user is already verified', async () => {
    await expect(findUserByEmail(TEST_VERIFIED_USER_EMAIL)).rejects.toThrow(DuplicatedError)
  })
})
