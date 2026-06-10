import * as readline from 'readline'
import { Pool, PoolClient } from 'pg'
import { getSecret } from '../shared/utils/secrets'

const SECRET_ID: string = process.env.DB_SECRET_ID ?? 'onboardingCredentialsDev'

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

  const confirm: string = await prompt('⚠️  This will drop all tables. Type "reset" to confirm: ')
  if (confirm !== 'reset') {
    console.log('Cancelled.')
    rl.close()
    process.exit(0)
  }

  let client: PoolClient | undefined
  let pool: Pool | undefined

  try {
    const raw: string = await getSecret(SECRET_ID)
    const credentials: { user: string; password: string; host: string; port: number; dbname: string } = JSON.parse(raw)

    pool = new Pool({
      user: credentials.user,
      password: credentials.password,
      host: credentials.host,
      port: credentials.port,
      database: credentials.dbname,
      ssl: { rejectUnauthorized: false },
    })

    client = await pool.connect()

    console.log('Fetching tables...')
    const { rows } = await client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    )
    const tables: string[] = rows.map((r: { tablename: string }): string => r.tablename)

    if (tables.length === 0) {
      console.log('No tables to drop')
      client.release()
      await pool.end()
      rl.close()
      process.exit(0)
    }

    console.log(`Dropping ${tables.length} table(s)...`)
    for (const table of tables) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`)
    }

    console.log('✅ All tables dropped')
    client.release()
    await pool.end()
    rl.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Reset failed:', error instanceof Error ? error.message : error)
    client?.release()
    await pool?.end()
    rl.close()
    process.exit(1)
  }
}

void resetDb()
