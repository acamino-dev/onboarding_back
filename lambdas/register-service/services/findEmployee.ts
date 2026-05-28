import { and, eq } from 'drizzle-orm'
import { NotFoundError } from '../../../shared/constants/errors'
import { getDb } from '../../../shared/db/client'
import { companies, employees } from '../../../shared/db/schema'

type Employee = typeof employees.$inferSelect

export async function findEmployee(
  employeeNumber: string,
  companyId: string,
  tenantId: string,
  connectionString: string
): Promise<Employee> {
  try {
    const db = getDb(connectionString)

    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)))
      .limit(1)

    if (!company) throw new NotFoundError('Company not found')

    const [employee] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.employeeNumber, employeeNumber),
          eq(employees.companyId, companyId),
          eq(employees.tenantId, tenantId),
          eq(employees.isActive, true)
        )
      )
      .limit(1)

    if (!employee) throw new NotFoundError('Employee not found')

    return employee
  } catch (e) {
    if (e instanceof NotFoundError) throw e
    throw new Error(`Error on findEmployee: ${e}`)
  }
}
