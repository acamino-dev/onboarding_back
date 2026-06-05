export interface Company {
  id: string
  name: string
  tenant_id: string
  created_at: Date
}

export interface Employee {
  id: string
  employee_number: string
  rfc: string
  company_id: string
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  is_active: boolean
  created_at: Date
}

export interface User {
  id: string
  employee_id: string
  company_id: string
  tenant_id: string
  email: string
  password_hash: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface PasswordResetToken {
  id: string
  user_id: string
  token: string
  tenant_id: string
  expires_at: Date
  created_at: Date
}
