import dotenv from 'dotenv'
import path from 'path'
import { getDb } from '../../../../../shared/db/client'

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env.development') })

export function getTestDb() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString)
    throw new Error(
      'DATABASE_URL is not set in .env.development. Ensure .env.development exists and contains DATABASE_URL="postgresql://..."'
    )
  return { db: getDb(connectionString), connectionString }
}
