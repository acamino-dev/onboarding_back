import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { getDb } from '../shared/db/client'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

async function resetDb() {
  // Safety check: only in dev
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'dev') {
    console.error('❌ reset-db only works in dev environment')
    process.exit(1)
  }

  if (!process.env.DB_SECRET_ID) {
    console.error('❌ DB_SECRET_ID env var not set')
    process.exit(1)
  }

  // Confirm with user
  const confirm = await prompt('⚠️  This will drop all tables and reset to initial schema. Type "reset" to confirm: ')
  if (confirm !== 'reset') {
    console.log('Cancelled.')
    rl.close()
    process.exit(0)
  }

  try {
    console.log('Connecting to database...')
    const db = await getDb()

    // Drop tables in reverse dependency order
    console.log('Dropping tables...')
    await db.query('DROP TABLE IF EXISTS password_reset_tokens CASCADE')
    await db.query('DROP TABLE IF EXISTS users CASCADE')
    await db.query('DROP TABLE IF EXISTS employees CASCADE')
    await db.query('DROP TABLE IF EXISTS companies CASCADE')

    // Read and execute migrations
    console.log('Executing migrations...')
    const migrationPath = path.join(__dirname, '../migrations/001_initial_schema.sql')
    const migration = fs.readFileSync(migrationPath, 'utf-8')

    // Split by semicolon and execute each statement
    const statements = migration.split(';').filter((stmt) => stmt.trim())
    for (const statement of statements) {
      await db.query(statement)
    }

    console.log('✅ Database reset to initial schema')
    rl.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Reset failed:', error instanceof Error ? error.message : error)
    rl.close()
    process.exit(1)
  }
}

resetDb()
