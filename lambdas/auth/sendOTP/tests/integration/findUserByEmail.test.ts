import { ForbiddenError, NotFoundError } from '../../../../../shared/constants/errors'
import { getDb } from '../../../../../shared/db/client'
import { findUserByEmail } from '../../services/findUserByEmail'
import { TEST_OTP_EMAIL, VERIFIED_USER } from './helpers/constants'

describe('findUserByEmail integration', () => {
  beforeAll(async () => {
    const db = await getDb()
    await db.query(
      'INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
      [VERIFIED_USER.id, VERIFIED_USER.employeeId, VERIFIED_USER.companyId, VERIFIED_USER.email, '$2b$10$hashedpassword', true]
    )
  })

  afterAll(async () => {
    const db = await getDb()
    await db.query('DELETE FROM users WHERE id = $1', [VERIFIED_USER.id])
  })

  it('happy path — returns user for seeded email with otp_verified false', async () => {
    const user = await findUserByEmail(TEST_OTP_EMAIL)
    expect(user.email).toBe(TEST_OTP_EMAIL)
    expect(user.otp_verified).toBe(false)
  })

  it('throws NotFoundError when email does not exist', async () => {
    await expect(findUserByEmail('nonexistent@nowhere.com')).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when user already has otp_verified true', async () => {
    await expect(findUserByEmail(VERIFIED_USER.email)).rejects.toThrow(ForbiddenError)
  })
})
