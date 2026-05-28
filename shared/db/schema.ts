import { boolean, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeNumber: varchar('employee_number', { length: 100 }).notNull(),
  rfc: varchar('rfc', { length: 13 }).notNull(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  tenantId: uuid('tenant_id').notNull(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  tenantId: uuid('tenant_id').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  token: varchar('token', { length: 255 }).notNull().unique(),
  tenantId: uuid('tenant_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
