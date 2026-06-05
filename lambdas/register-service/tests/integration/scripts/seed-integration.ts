import dotenv from 'dotenv'
import path from 'path'
import bcrypt from 'bcrypt'
import { getDb } from '../../../../../shared/db/client'
import { EMPLOYEES, SEEDED_USER_ID, TEST_COMPANY_ID, TEST_TENANT_ID } from '../helpers/constants'

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env.development') })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set in .env.development')
  process.exit(1)
}

const db = getDb(connectionString)

async function seed() {
  console.log('Seeding integration test data...')

  try {
    await db.query(
      'INSERT INTO companies (id, name, tenant_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [TEST_COMPANY_ID, 'Integration Test Company', TEST_TENANT_ID]
    )

    for (const [key, emp] of Object.entries(EMPLOYEES)) {
      await db.query(
        'INSERT INTO employees (id, employee_number, rfc, company_id, tenant_id, first_name, last_name, email, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING',
        [
          emp.id,
          emp.employeeNumber,
          emp.rfc,
          TEST_COMPANY_ID,
          TEST_TENANT_ID,
          emp.firstName,
          emp.lastName,
          emp.email,
          key !== 'inactive',
        ]
      )
    }

    const passwordHash = await bcrypt.hash('TestSeed123!', 10)
    await db.query(
      'INSERT INTO users (id, employee_id, company_id, tenant_id, email, password_hash) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
      [
        SEEDED_USER_ID,
        EMPLOYEES.withUser.id,
        TEST_COMPANY_ID,
        TEST_TENANT_ID,
        EMPLOYEES.withUser.email,
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
