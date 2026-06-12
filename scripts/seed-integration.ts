import bcrypt from 'bcryptjs'
import { getDb } from '../shared/db/client'
import { EMPLOYEES, SEEDED_USER_ID, TEST_COMPANY_ID } from './constants'

if (!process.env.DB_SECRET_ID) {
  console.error('DB_SECRET_ID is not set')
  process.exit(1)
}

const seed = async (): Promise<void> => {
  console.log('Seeding integration test data...')

  try {
    const db = await getDb()

    await db.query(
      'INSERT INTO companies (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [TEST_COMPANY_ID, 'Apoyo en el Camino']
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
      'INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
      [
        SEEDED_USER_ID,
        EMPLOYEES.withUser.id,
        TEST_COMPANY_ID,
        EMPLOYEES.withUser.email,
        passwordHash,
        false,
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
