import { getDb } from '../../../../../shared/db/client'

export function getTestDb() {
  const connectionString = process.env.TEST_DB_CONNECTION_STRING
  if (!connectionString)
    throw new Error(
      'TEST_DB_CONNECTION_STRING is not set. Copy .env.test.example to .env.test and fill in the value, then run: export $(cat .env.test)'
    )
  return { db: getDb(connectionString), connectionString }
}
