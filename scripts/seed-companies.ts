import { ConditionalCheckFailedException, DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"

const tableName = `onboardingCompaniesDBDev`

const client = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(client)

const companies = [
  { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", name: "Apoyo en el camino" },
]

async function seedCompanies(): Promise<void> {
  for (const company of companies) {
    try {
      await documentClient.send(
        new PutCommand({
          TableName: tableName,
          Item: { ...company, created_at: Math.floor(Date.now() / 1000) },
          ConditionExpression: "attribute_not_exists(id)",
        })
      )
      console.log(`Inserted "${company.name}"`)
    } catch (e) {
      if (e instanceof ConditionalCheckFailedException) {
        console.log(`Skipping "${company.name}" — already exists`)
        continue
      }
      throw e
    }
  }

  console.log("Done.")
  process.exit(0)
}

seedCompanies()
