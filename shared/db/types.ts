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
  first_name: string
  last_name: string
  password_hash: string
  created_at: Date
  updated_at: Date
}

export interface PasswordResetToken {
  id: string
  user_id: string
  token: string
  expires_at: Date
  created_at: Date
}
