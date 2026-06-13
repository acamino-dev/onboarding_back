import { createHash, randomUUID } from 'crypto'

export type RefreshTokenPair = {
  rawToken: string
  tokenHash: string
}

export const generateRefreshToken = (): RefreshTokenPair => {
  const rawToken = randomUUID()
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  return { rawToken, tokenHash }
}
