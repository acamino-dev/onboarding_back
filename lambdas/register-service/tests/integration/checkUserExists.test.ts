import { DuplicatedError } from '../../../../shared/constants/errors'
import { checkUserExists } from '../../services/checkUserExists'
import { EMPLOYEES } from './helpers/constants'
import { getTestDb } from './helpers/db'

const { connectionString } = getTestDb()

describe('checkUserExists integration', () => {
  it('resolves without error when no user exists for the employee', async () => {
    await expect(checkUserExists(EMPLOYEES.clean.id, connectionString)).resolves.toBeUndefined()
  })

  it('throws DuplicatedError when a user already exists for the employee', async () => {
    await expect(checkUserExists(EMPLOYEES.withUser.id, connectionString)).rejects.toThrow(DuplicatedError)
  })
})
