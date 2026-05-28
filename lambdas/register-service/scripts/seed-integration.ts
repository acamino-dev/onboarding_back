import bcrypt from 'bcrypt'
import { getDb } from '../../../shared/db/client'
import { companies, employees, users } from '../../../shared/db/schema'
import { EMPLOYEES, SEEDED_USER_ID, TEST_COMPANY_ID, TEST_TENANT_ID } from '../tests/integration/helpers/constants'

const connectionString = process.env.TEST_DB_CONNECTION_STRING
if (!connectionString) {
  console.error('TEST_DB_CONNECTION_STRING is not set')
  process.exit(1)
}

const db = getDb(connectionString)

async function seed() {
  console.log('Seeding integration test data...')

  await db
    .insert(companies)
    .values({ id: TEST_COMPANY_ID, name: 'Integration Test Company', tenantId: TEST_TENANT_ID })
    .onConflictDoNothing()

  for (const [key, emp] of Object.entries(EMPLOYEES)) {
    await db
      .insert(employees)
      .values({
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        rfc: emp.rfc,
        companyId: TEST_COMPANY_ID,
        tenantId: TEST_TENANT_ID,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        isActive: key !== 'inactive',
      })
      .onConflictDoNothing()
  }

  const passwordHash = await bcrypt.hash('TestSeed123!', 10)
  await db
    .insert(users)
    .values({
      id: SEEDED_USER_ID,
      employeeId: EMPLOYEES.withUser.id,
      companyId: TEST_COMPANY_ID,
      tenantId: TEST_TENANT_ID,
      email: EMPLOYEES.withUser.email,
      passwordHash,
    })
    .onConflictDoNothing()

  console.log('Done. Seeded: 1 company, 5 employees, 1 user.')
  process.exit(0)
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
