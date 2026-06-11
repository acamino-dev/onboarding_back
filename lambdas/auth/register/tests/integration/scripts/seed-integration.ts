import bcrypt from 'bcryptjs'
import { getDb } from '../../../../../../shared/db/client'
import { EMPLOYEES, SEEDED_USER_ID, TEST_COMPANY_ID } from '../helpers/constants'

if (!process.env.DB_SECRET_ID) {
  console.error('DB_SECRET_ID is not set')
  process.exit(1)
}

async function seed() {
  console.log('Seeding integration test data...')

  try {
    const db = await getDb()

    await db.query(
      'INSERT INTO companies (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [TEST_COMPANY_ID, 'Integration Test Company']
    )

    for (const [key, emp] of Object.entries(EMPLOYEES)) {
      await db.query(
        'INSERT INTO employees (id, employee_number, rfc, company_id, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        [
          emp.id,
          emp.employeeNumber,
          emp.rfc,
          TEST_COMPANY_ID,
          key !== 'inactive',
        ]
      )
    }

    const passwordHash = await bcrypt.hash('TestSeed123!', 10)
    await db.query(
      'INSERT INTO users (id, employee_id, company_id, email, first_name, last_name, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
      [
        SEEDED_USER_ID,
        EMPLOYEES.withUser.id,
        TEST_COMPANY_ID,
        EMPLOYEES.withUser.email,
        EMPLOYEES.withUser.firstName,
        EMPLOYEES.withUser.lastName,
        passwordHash,
      ]
    )

    console.log('Done. Seeded: 1 company, 5 employees, 1 user.')
    process.exit(0)
  } catch (e) {
    console.error('Seed error:', e)
    process.exit(1)
  }
}

seed()
