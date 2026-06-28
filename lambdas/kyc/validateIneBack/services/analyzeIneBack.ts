import { AnalyzeDocumentCommand, TextractClient, type Block } from '@aws-sdk/client-textract'
import { ValidationError } from '../../../../shared/constants/errors'

const textractClient = new TextractClient({})

// MRZ name line: only uppercase letters and '<', contains '<<', no digits, length >= 15
const MRZ_NAME_LINE_PATTERN = /^[A-ZÁÉÍÓÚÜÑ<]{15,}$/

// INE back TD1 MRZ always starts with IDMEX — absent on front
const isIneBack = (blocks: Block[]): boolean =>
  blocks
    .filter((b: Block) => b.BlockType === 'LINE')
    .some((b: Block) => /^IDMEX/.test(b.Text?.toUpperCase().trim() ?? ''))

// MRZ name line format: APELLIDO1<APELLIDO2<<NOMBRE1<NOMBRE2<<<
const extractNameFromMrz = (blocks: Block[]): string | undefined => {
  const mrzLine = blocks
    .filter((b: Block) => b.BlockType === 'LINE')
    .map((b: Block) => b.Text?.toUpperCase().trim() ?? '')
    .find((t) => MRZ_NAME_LINE_PATTERN.test(t) && t.includes('<<'))

  if (!mrzLine) return undefined

  const doubleAngleIdx = mrzLine.indexOf('<<')
  const surnamesPart = mrzLine.slice(0, doubleAngleIdx)
  const givenNamesPart = mrzLine.slice(doubleAngleIdx + 2).replace(/<+$/, '')

  const surnames = surnamesPart.split('<').filter(Boolean)
  const givenNames = givenNamesPart.split('<').filter(Boolean)

  if (surnames.length === 0 || givenNames.length === 0) return undefined

  return [...surnames, ...givenNames].join(' ')
}

export const analyzeIneBack = async (bucket: string, key: string): Promise<string> => {
  try {
    const response = await textractClient.send(
      new AnalyzeDocumentCommand({
        Document: { S3Object: { Bucket: bucket, Name: key } },
        FeatureTypes: ['FORMS'],
      })
    )

    const blocks = response.Blocks ?? []

    if (!isIneBack(blocks)) {
      throw new ValidationError('Document is not INE back (IDMEX marker not found)')
    }

    const mrzName = extractNameFromMrz(blocks)
    if (mrzName) return mrzName

    throw new ValidationError('Name not found in INE back document')
  } catch (error) {
    if (error instanceof ValidationError) throw error
    throw new Error(
      `Error on analyzeIneBack: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
