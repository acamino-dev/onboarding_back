import * as readline from 'readline'
import { Pool } from 'pg'
import { getSecret } from '../shared/db/secrets'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const prompt = (question: string): Promise<string> => {
  return new Promise((resolve: (value: string) => void): void => {
    rl.question(question, resolve)
  })
}

const resetDb = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'dev') {
    console.error('❌ reset-db only works in dev environment')
    process.exit(1)
  }

  if (!process.env.DB_SECRET_ID) {
    console.error('❌ DB_SECRET_ID env var not set')
    process.exit(1)
  }

  const confirm: string = await prompt('⚠️  This will DROP and CREATE the database. Type "reset" to confirm: ')
  if (confirm !== 'reset') {
    console.log('Cancelled.')
    rl.close()
    process.exit(0)
  }

  try {
    const secretId: string = process.env.DB_SECRET_ID
    const raw: string = await getSecret(secretId)
    const credentials: { user: string; password: string; host: string; port: number; dbname: string } = JSON.parse(raw)

    const adminPool: Pool = new Pool({
      user: credentials.user,
      password: credentials.password,
      host: credentials.host,
      port: credentials.port,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    })

    console.log('Dropping database...')
    await adminPool.query(`DROP DATABASE IF EXISTS ${credentials.dbname}`)

    console.log('Creating database...')
    await adminPool.query(`CREATE DATABASE ${credentials.dbname}`)

    await adminPool.end()

    console.log('✅ Database dropped and recreated')
    rl.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Reset failed:', error instanceof Error ? error.message : error)
    rl.close()
    process.exit(1)
  }
}

void resetDb()
