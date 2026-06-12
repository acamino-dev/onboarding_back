import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const sesClient = new SESClient({})

export const sendOtpEmail = async (
  toEmail: string,
  code: string,
  fromEmail: string
): Promise<void> => {
  try {
    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: 'Tu código de verificación',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: `Tu código de verificación es: ${code}\n\nEste código expira en 15 minutos.`,
            Charset: 'UTF-8',
          },
          Html: {
            Data: `<p>Tu código de verificación es: <strong>${code}</strong></p><p>Este código expira en 15 minutos.</p>`,
            Charset: 'UTF-8',
          },
        },
      },
    })

    await sesClient.send(command)
  } catch (error) {
    throw new Error(`Error on sendOtpEmail: ${error instanceof Error ? error.message : String(error)}`)
  }
}
