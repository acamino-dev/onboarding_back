import { NotFoundError, UnverifiedError } from '../../../../../shared/constants/errors'
import { getDb } from '../../../../../shared/db/client'
import { findVerifiedUserByEmail } from '../../services/findVerifiedUserByEmail'
import { TEST_EMPLOYEE, TEST_USER, TEST_COMPANY_ID } from './helpers/constants'

const OTP_TABLE_NAME = process.env.OTP_TABLE_NAME as string

beforeAll(async () => {
  const db = await getDb()
  await db.query(
    'INSERT INTO employees (id, employee_number, rfc, company_id, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
    [TEST_EMPLOYEE.id, TEST_EMPLOYEE.employee_number, TEST_EMPLOYEE.rfc, TEST_COMPANY_ID, true]
  )
  await db.query(
    'INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
    [TEST_USER.id, TEST_EMPLOYEE.id, TEST_COMPANY_ID, TEST_USER.email, TEST_USER.password_hash, true]
  )
})

afterAll(async () => {
  const db = await getDb()
  await db.query('DELETE FROM users WHERE id = $1', [TEST_USER.id])
  await db.query('DELETE FROM employees WHERE id = $1', [TEST_EMPLOYEE.id])
})

describe('findVerifiedUserByEmail integration', () => {
  it('returns verified user when found', async () => {
    const user = await findVerifiedUserByEmail(TEST_USER.email)
    expect(user.email).toBe(TEST_USER.email)
    expect(user.otp_verified).toBe(true)
  })

  it('throws NotFoundError when user does not exist', async () => {
    await expect(findVerifiedUserByEmail('nonexistent@company.com')).rejects.toThrow(NotFoundError)
  })

  it('throws UnverifiedError when user otp_verified is false', async () => {
    const db = await getDb()
    const unverifiedEmail = 'unverified.reset@company.com'
    await db.query(
      'INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
      ['e5f6a7b8-c9d0-1234-efab-345678901234', TEST_EMPLOYEE.id, TEST_COMPANY_ID, unverifiedEmail, TEST_USER.password_hash, false]
    )
    try {
      await expect(findVerifiedUserByEmail(unverifiedEmail)).rejects.toThrow(UnverifiedError)
    } finally {
      await db.query('DELETE FROM users WHERE email = $1', [unverifiedEmail])
    }
  })
})
