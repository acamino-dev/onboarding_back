import { Pool } from 'pg'

interface QueryResult<T> {
  rows: T[]
}

interface DB {
  query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | undefined>
}

let db: DB | undefined

export function getDb(connectionString: string): DB {
  if (!db) {
    const pool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 5000,
      ssl: {
        rejectUnauthorized: false
      }
    })

    db = {
      async query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
        const result = await pool.query(sql, params)
        return { rows: result.rows as T[] }
      },
      async queryOne<T>(sql: string, params?: unknown[]): Promise<T | undefined> {
        const result = await pool.query(sql, params)
        return (result.rows[0] as T) || undefined
      }
    }
  }
  return db
}
