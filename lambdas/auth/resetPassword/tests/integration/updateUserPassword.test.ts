import { getDb } from '../../../../../shared/db/client'
import { updateUserPassword } from '../../services/updateUserPassword'
import { TEST_EMPLOYEE, TEST_USER, TEST_COMPANY_ID } from './helpers/constants'

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

describe('updateUserPassword integration', () => {
  it('updates password_hash in DB for the given email', async () => {
    await updateUserPassword(TEST_USER.email, 'NewPassword123')

    const db = await getDb()
    const user = await db.queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE email = $1',
      [TEST_USER.email]
    )

    expect(user).toBeDefined()
    expect(user!.password_hash).not.toBe(TEST_USER.password_hash)
    expect(user!.password_hash).toMatch(/^\$2[ab]\$/)
  })
})
