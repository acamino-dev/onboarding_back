export type KycProcess = {
  creditId: string
  userId: string
  step: string
  amount: number
  term: number
  rate: number
  fullName: string | null
  curp: string | null
  rfc: string | null
  birthDate: string | null
  address: string | null
  neighborhood: string | null
  city: string | null
  postalCode: string | null
  accountLast4: string | null
}
