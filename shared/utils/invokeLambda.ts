import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

const client = new LambdaClient({})

export const invokeLambda = async <T>(
  functionName: string,
  payload: unknown
): Promise<T> => {
  let response
  try {
    response = await client.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "RequestResponse",
        Payload: JSON.stringify(payload),
      })
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Error on invokeLambda: ${msg}`)
  }

  if (response.FunctionError) {
    const raw = response.Payload
      ? new TextDecoder().decode(response.Payload)
      : "unknown error"
    let errorMessage: string
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      errorMessage =
        typeof parsed.errorMessage === "string" ? parsed.errorMessage : raw
    } catch {
      errorMessage = raw
    }
    throw new Error(
      `Error on invokeLambda: ${functionName} FunctionError: ${errorMessage}`
    )
  }

  if (!response.Payload) {
    throw new Error(`Error on invokeLambda: ${functionName} returned empty payload`)
  }

  try {
    const raw = new TextDecoder().decode(response.Payload)
    return JSON.parse(raw) as T
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Error on invokeLambda: failed to parse response payload: ${msg}`)
  }
}

export const invokeLambdaAsync = async (
  functionName: string,
  payload: unknown
): Promise<void> => {
  try {
    await client.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "Event",
        Payload: JSON.stringify(payload),
      })
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Error on invokeLambdaAsync: ${msg}`)
  }
}
