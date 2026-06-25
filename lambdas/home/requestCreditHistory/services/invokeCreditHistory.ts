import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import type { CreditHistoryResult } from '../types/CreditHistoryResult'

const client = new LambdaClient({})

export const invokeCreditHistory = async (
  rfc: string,
  functionName: string
): Promise<CreditHistoryResult> => {
  try {
    const command = new InvokeCommand({
      FunctionName: functionName,
      Payload: JSON.stringify({ body: JSON.stringify({ rfc }) }),
    })

    const response = await client.send(command)

    if (!response.Payload) {
      throw new Error('Empty payload from getCreditHistory')
    }

    const parsed = JSON.parse(Buffer.from(response.Payload).toString()) as {
      statusCode: number
      body: string
    }

    if (parsed.statusCode !== 200) {
      throw new Error(`getCreditHistory returned status ${parsed.statusCode}`)
    }

    return JSON.parse(parsed.body) as CreditHistoryResult
  } catch (error) {
    throw new Error(
      `Error on invokeCreditHistory: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
