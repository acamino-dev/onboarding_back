import { AuthError } from '../../../../../shared/constants/errors'
import { getDb } from '../../../../../shared/db/client'
import { findUser } from '../../services/findUser'
import { SEEDED_USER_ID, TEST_COMPANY_ID, EMPLOYEES } from './helpers/constants'

beforeAll(async () => {
  const db = await getDb()
  await db.query(
    'INSERT INTO employees (id, employee_number, rfc, company_id, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
    [EMPLOYEES.withUser.id, EMPLOYEES.withUser.employeeNumber, EMPLOYEES.withUser.rfc, TEST_COMPANY_ID, true]
  )
  await db.query(
    'INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
    [SEEDED_USER_ID, EMPLOYEES.withUser.id, TEST_COMPANY_ID, EMPLOYEES.withUser.email, 'placeholder_hash', false]
  )
})

afterAll(async () => {
  const db = await getDb()
  await db.query('DELETE FROM users WHERE id = $1', [SEEDED_USER_ID])
  await db.query('DELETE FROM employees WHERE id = $1', [EMPLOYEES.withUser.id])
})

describe('findUser integration', () => {
  it('returns email and companyId for existing user', async () => {
    const result = await findUser(SEEDED_USER_ID)
    expect(result.email).toBe(EMPLOYEES.withUser.email)
    expect(result.companyId).toBe(TEST_COMPANY_ID)
  })

  it('throws AuthError when user does not exist', async () => {
    await expect(
      findUser('00000000-0000-0000-0000-000000000000')
    ).rejects.toThrow(AuthError)
  })
})
