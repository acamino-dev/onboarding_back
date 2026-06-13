import { NotFoundError } from '../../../../../shared/constants/errors'
import { getDb } from '../../../../../shared/db/client'
import { findUserByEmail } from '../../services/findUserByEmail'
import { LOGIN_USER, SEEDED_USER_ID, TEST_COMPANY_ID } from './helpers/constants'
import { EMPLOYEES } from '../../../../../scripts/constants'

beforeAll(async () => {
  const db = await getDb()
  await db.query(
    `INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (id) DO UPDATE SET otp_verified = true`,
    [SEEDED_USER_ID, LOGIN_USER.employeeId, TEST_COMPANY_ID, LOGIN_USER.email, LOGIN_USER.passwordHash]
  )
})

afterAll(async () => {
  const db = await getDb()
  await db.query('DELETE FROM users WHERE id = $1', [SEEDED_USER_ID])
})

describe('findUserByEmail integration', () => {
  it('returns user with employee data on happy path', async () => {
    const user = await findUserByEmail(LOGIN_USER.email)

    expect(user.id).toBe(SEEDED_USER_ID)
    expect(user.email).toBe(LOGIN_USER.email)
    expect(user.company_id).toBe(TEST_COMPANY_ID)
    expect(user.otp_verified).toBe(true)
    expect(user.is_active).toBe(true)
    expect(user.password_hash).toBeDefined()
  })

  it('throws NotFoundError when email does not exist', async () => {
    await expect(findUserByEmail('nonexistent@example.com')).rejects.toThrow(NotFoundError)
  })

  it('throws wrapped Error on DB failure', async () => {
    const db = await getDb()
    await db.query('DELETE FROM users WHERE id = $1', [SEEDED_USER_ID])

    await expect(findUserByEmail(LOGIN_USER.email)).rejects.toThrow(NotFoundError)

    await db.query(
      `INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT DO NOTHING`,
      [SEEDED_USER_ID, LOGIN_USER.employeeId, TEST_COMPANY_ID, LOGIN_USER.email, LOGIN_USER.passwordHash]
    )
  })

  it('reflects is_active false when employee is inactive', async () => {
    const db = await getDb()
    const inactiveUserId = 'f0000000-0000-0000-0000-000000000099'
    await db.query(
      `INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT DO NOTHING`,
      [inactiveUserId, EMPLOYEES.inactive.id, TEST_COMPANY_ID, EMPLOYEES.inactive.email, LOGIN_USER.passwordHash]
    )

    const user = await findUserByEmail(EMPLOYEES.inactive.email)
    expect(user.is_active).toBe(false)

    await db.query('DELETE FROM users WHERE id = $1', [inactiveUserId])
  })
})
