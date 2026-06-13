import { NotFoundError, UnverifiedError } from '../../../../../shared/constants/errors'
import { getDb } from '../../../../../shared/db/client'
import { findVerifiedUserByEmail } from '../../services/findVerifiedUserByEmail'
import { VERIFIED_USER, UNVERIFIED_USER } from './helpers/constants'

describe('findVerifiedUserByEmail integration', () => {
  beforeAll(async () => {
    const db = await getDb()
    await db.query(
      'INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
      [VERIFIED_USER.id, VERIFIED_USER.employeeId, VERIFIED_USER.companyId, VERIFIED_USER.email, '$2b$10$placeholder.hash.for.integration.tests.only', true]
    )
    await db.query(
      'INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
      [UNVERIFIED_USER.id, UNVERIFIED_USER.employeeId, UNVERIFIED_USER.companyId, UNVERIFIED_USER.email, '$2b$10$placeholder.hash.for.integration.tests.only', false]
    )
  })

  afterAll(async () => {
    const db = await getDb()
    await db.query('DELETE FROM users WHERE id = $1', [VERIFIED_USER.id])
    await db.query('DELETE FROM users WHERE id = $1', [UNVERIFIED_USER.id])
  })

  it('happy path — returns verified user for seeded email', async () => {
    const user = await findVerifiedUserByEmail(VERIFIED_USER.email)
    expect(user.email).toBe(VERIFIED_USER.email)
    expect(user.otp_verified).toBe(true)
  })

  it('throws NotFoundError when email does not exist', async () => {
    await expect(findVerifiedUserByEmail('nonexistent@nowhere.com')).rejects.toThrow(NotFoundError)
  })

  it('throws UnverifiedError when user has otp_verified false', async () => {
    await expect(findVerifiedUserByEmail(UNVERIFIED_USER.email)).rejects.toThrow(UnverifiedError)
  })
})
