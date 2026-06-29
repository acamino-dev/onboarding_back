export type KycRecord = {
  creditId: string
  userId: string
  step: string
  s3Keys?: Partial<Record<string, string>>
  curp?: string
  amount: number
  term: number
  created_at: number
  expires_at: number
}
