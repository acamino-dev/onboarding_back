export type KycRecord = {
  creditId: string
  userId: string
  step: string
  s3Keys?: Partial<Record<string, string>>
  fullName?: string
  rfc?: string
  amount: number
  term: number
  created_at: number
  expires_at: number
}
