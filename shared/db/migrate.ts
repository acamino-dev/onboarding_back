import fs from 'fs'
import path from 'path'
import { Pool, PoolClient } from 'pg'
import { getSecret } from '../utils/secrets'

const SECRET_ID = process.env.DB_SECRET_ID ?? 'onboardingCredentialsDev'

const main = async (): Promise<void> => {
  const raw = await getSecret(SECRET_ID)
  const { user, password, host, port, dbname } = JSON.parse(raw) as {
    user: string
    password: string
    host: string
    port: number
    dbname: string
  }

  const pool = new Pool({ user, password, host, port, database: dbname, ssl: { rejectUnauthorized: false } })
  let client: PoolClient | undefined

  try {
    client = await pool.connect()

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations'
    )
    const applied = new Set(rows.map(r => r.filename))

    const migrationDir = path.resolve('migrations')
    const pending = fs
      .readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql') && !applied.has(f))
      .sort()

    if (pending.length === 0) {
      console.log('No pending migrations')
      return
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8')
      console.log(`Running migration: ${file}`)

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        )
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`)
      }
    }

    console.log(`${pending.length} migration(s) applied successfully`)
  } finally {
    client?.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
