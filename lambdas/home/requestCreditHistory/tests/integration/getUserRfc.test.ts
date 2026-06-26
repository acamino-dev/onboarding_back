import { NotFoundError } from '../../../../../shared/constants/errors'
import { getDb } from '../../../../../shared/db/client'
import { getUserRfc } from '../../services/getUserRfc'
import { TEST_EMPLOYEE, TEST_USER, TEST_COMPANY_ID } from './helpers/constants'

beforeAll(async () => {
  const db = await getDb()
  await db.query(
    `INSERT INTO employees (id, employee_number, rfc, company_id, is_active)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
    [TEST_EMPLOYEE.id, TEST_EMPLOYEE.employee_number, TEST_EMPLOYEE.rfc, TEST_COMPANY_ID, true]
  )
  await db.query(
    `INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
    [TEST_USER.id, TEST_EMPLOYEE.id, TEST_COMPANY_ID, TEST_USER.email, '$2b$placeholder.hash.for.integration.tests.only', true]
  )
})

afterAll(async () => {
  const db = await getDb()
  await db.query('DELETE FROM users WHERE id = $1', [TEST_USER.id])
  await db.query('DELETE FROM employees WHERE id = $1', [TEST_EMPLOYEE.id])
})

describe('getUserRfc integration', () => {
  it('happy path — returns rfc for user', async () => {
    await expect(getUserRfc(TEST_USER.id)).resolves.toBe(TEST_EMPLOYEE.rfc)
  })

  it('throws NotFoundError when userId does not exist', async () => {
    await expect(getUserRfc('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError)
  })
})
