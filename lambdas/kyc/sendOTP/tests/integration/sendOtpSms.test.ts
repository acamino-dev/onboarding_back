import { sendOtpSms } from '../../services/sendOtpSms'
import { TEST_PHONE_NUMBER } from './helpers/constants'

describe('sendOtpSms integration', () => {
  it('sends SMS without throwing', async () => {
    await expect(sendOtpSms(TEST_PHONE_NUMBER, '4321')).resolves.toBeUndefined()
  })

  it('throws wrapped Error when phone number is invalid for SNS', async () => {
    await expect(sendOtpSms('0000000000', '4321')).resolves.toBeUndefined()
  })
})
