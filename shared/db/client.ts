import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

type DB = NodePgDatabase<typeof schema>

let db: DB | undefined

export function getDb(connectionString: string): DB {
  if (!db) {
    const pool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 5000,
    })
    db = drizzle(pool, { schema })
  }
  return db
}
