import bcrypt from 'bcryptjs'
import { AuthError } from '../../../../shared/constants/errors'

export const comparePassword = async (plain: string, hash: string): Promise<void> => {
  const match = await bcrypt.compare(plain, hash)
  if (!match) {
    throw new AuthError('Invalid credentials', {
      file: 'lambdas/auth/login/utils/comparePassword.ts',
      function: 'comparePassword',
      operation: 'bcrypt compare',
    })
  }
}
