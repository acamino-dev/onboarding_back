export type KycRecord = {
  creditId: string
  userId: string
  step: string
  s3Key?: string
  amount: number
  term: number
  created_at: number
  expires_at: number
}
