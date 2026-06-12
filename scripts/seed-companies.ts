import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
import { v4 as uuidv4 } from "uuid"

const environment = process.env.ENVIRONMENT || "Dev"
const tableName = `onboardingCompaniesDB${environment}`

const client = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(client)

const companies = [
  { name: "Acme Corp" },
  { name: "Tech Innovations Ltd" },
  { name: "Global Solutions Inc" },
]

async function seedCompanies(): Promise<void> {
  for (const company of companies) {
    const now = Math.floor(Date.now() / 1000)
    const item = {
      id: uuidv4(),
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
