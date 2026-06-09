import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'

export const runMigrations = async (connectionString: string): Promise<void> => {
  const pool = new Pool({ connectionString })

  try {
    const migrationDir = path.join(__dirname, '../../migrations')
    const files = fs
      .readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const filePath = path.join(migrationDir, file)
      const sql = fs.readFileSync(filePath, 'utf-8')

      console.log(`Running migration: ${file}`)
      await pool.query(sql)
    }

    console.log('Migrations completed successfully')
  } finally {
    await pool.end()
  }
}
