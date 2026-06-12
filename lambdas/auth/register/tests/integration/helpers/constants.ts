export const TEST_COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'

export const EMPLOYEES = {
  active: {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    employeeNumber: 'INT001',
    rfc: 'GOAA970101AB1',
    email: 'john.doe@integrationtest.com',
  },
  inactive: {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    employeeNumber: 'INT002',
    rfc: 'GOAB970101AB1',
    email: 'jane.doe@integrationtest.com',
  },
  withUser: {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
    employeeNumber: 'INT003',
    rfc: 'GOAC970101AB1',
    email: 'bob.smith@integrationtest.com',
  },
  clean: {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
    employeeNumber: 'INT004',
    rfc: 'GOAD970101AB1',
    email: 'alice.smith@integrationtest.com',
  },
  forCreate: {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17',
    employeeNumber: 'INT005',
    rfc: 'GOAE970101AB1',
    email: 'charlie.brown@integrationtest.com',
  },
} as const

export const SEEDED_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18'
