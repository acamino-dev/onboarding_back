import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"

const tableName = `onboardingCompaniesDBDev`

const client = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(client)

const companies = [
  { name: "Apoyo en el camino" },
]

async function seedCompanies(): Promise<void> {
  for (const company of companies) {
    const now = Math.floor(Date.now() / 1000)
    const item = {
      id: crypto.randomUUID(),
      name: company.name,
      created_at: now,
    }

    await documentClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
      })
    )
  }
}

seedCompanies()
