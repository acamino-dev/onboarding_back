import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'

const client = new SecretsManagerClient({ region: 'us-east-1' })
const cache = new Map<string, string>()

export const getSecret = async (secretId: string): Promise<string> => {
  const cached = cache.get(secretId)
  if (cached) return cached

  const res = await client.send(new GetSecretValueCommand({ SecretId: secretId }))
  if (!res.SecretString) {
    throw new Error(`Secret ${secretId} has no string value`)
  }

  cache.set(secretId, res.SecretString)
  return res.SecretString
}
