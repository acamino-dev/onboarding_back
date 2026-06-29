import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

const snsClient = new SNSClient({})

export const sendOtpSms = async (phoneNumber: string, code: string): Promise<void> => {
  try {
    await snsClient.send(
      new PublishCommand({
        PhoneNumber: `+52${phoneNumber}`,
        Message: `Tu código de verificación es: ${code}`,
      })
    )
  } catch (error) {
    throw new Error(`Error on sendOtpSms: ${error instanceof Error ? error.message : String(error)}`)
  }
}
