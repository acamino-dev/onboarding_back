export interface Company {
  id: string
  name: string
  created_at: Date
}

export interface Employee {
  id: string
  employee_number: string
  rfc: string
  company_id: string
  is_active: boolean
  created_at: Date
}

export interface User {
  id: string
  employee_id: string
  company_id: string
  email: string
  password_hash: string
  otp_verified: boolean
  created_at: Date
  updated_at: Date
}
