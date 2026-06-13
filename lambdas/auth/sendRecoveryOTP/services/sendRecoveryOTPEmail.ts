import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const sesClient = new SESClient({})

export const sendRecoveryOTPEmail = async (
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
          Data: 'Código para recuperación de contraseña',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: `Tu código de recuperación de contraseña es: ${code}\n\nEste código expira en 15 minutos.\n\nSi no solicitaste este código, ignora este mensaje.`,
            Charset: 'UTF-8',
          },
          Html: {
            Data: `<p>Tu código de recuperación de contraseña es: <strong>${code}</strong></p><p>Este código expira en 15 minutos.</p><p>Si no solicitaste este código, ignora este mensaje.</p>`,
            Charset: 'UTF-8',
          },
        },
      },
    })

    await sesClient.send(command)
  } catch (error) {
    throw new Error(`Error on sendRecoveryOTPEmail: ${error instanceof Error ? error.message : String(error)}`)
  }
}
