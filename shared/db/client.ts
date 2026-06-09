import { Pool } from 'pg'
import { getSecret } from '../utils/secrets'

interface QueryResult<T> {
  rows: T[]
}

export interface DB {
  query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | undefined>
}

let db: DB | undefined

export const getDb = async (): Promise<DB> => {
  if (db) return db

  const secretId = process.env.DB_SECRET_ID
  if (!secretId) throw new Error('DB_SECRET_ID is not set')

  const raw = await getSecret(secretId)
  const { user, password, host, port, dbname } = JSON.parse(raw) as {
    user: string
    password: string
    host: string
    port: number
    dbname: string
  }

  const pool = new Pool({
    user,
    password,
    host,
    port,
    database: dbname,
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  db = {
    query: async <T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> => {
      const result = await pool.query(sql, params)
      return { rows: result.rows as T[] }
    },
    queryOne: async <T>(sql: string, params?: unknown[]): Promise<T | undefined> => {
      const result = await pool.query(sql, params)
      return (result.rows[0] as T) || undefined
    },
  }

  return db
}
