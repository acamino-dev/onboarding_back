import { DuplicatedError } from '../../../../../shared/constants/errors'
import { checkUserExists } from '../../services/checkUserExists'
import { EMPLOYEES } from '../../../../../scripts/constants'

describe('checkUserExists integration', () => {
  it('resolves without error when email is not registered', async () => {
    await expect(checkUserExists(EMPLOYEES.clean.email)).resolves.toBeUndefined()
  })

  it('throws DuplicatedError when email is already registered', async () => {
    await expect(checkUserExists(EMPLOYEES.withUser.email)).rejects.toThrow(DuplicatedError)
  })
})
