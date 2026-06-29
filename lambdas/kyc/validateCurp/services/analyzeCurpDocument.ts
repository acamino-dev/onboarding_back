import { AnalyzeDocumentCommand, TextractClient, type Block, type Relationship } from '@aws-sdk/client-textract'
import { ValidationError } from '../../../../shared/constants/errors'

const textractClient = new TextractClient({})

const CURP_REGEX = /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d\b/

const getTextForBlock = (block: Block, blockMap: Map<string, Block>): string => {
  if (!block.Relationships) return ''
  return (block.Relationships as Relationship[])
    .filter((r: Relationship) => r.Type === 'CHILD')
    .flatMap((r: Relationship) => r.Ids ?? [])
    .map((id: string) => blockMap.get(id))
    .filter((b): b is Block => b?.BlockType === 'WORD')
    .map((b: Block) => b.Text ?? '')
    .join(' ')
}

export const analyzeCurpDocument = async (bucket: string, key: string): Promise<string> => {
  try {
    const response = await textractClient.send(
      new AnalyzeDocumentCommand({
        Document: { S3Object: { Bucket: bucket, Name: key } },
        FeatureTypes: ['FORMS'],
      })
    )

    const blocks = response.Blocks ?? []
    const blockMap = new Map<string, Block>(blocks.map((b: Block) => [b.Id ?? '', b]))

    for (const block of blocks) {
      if (block.BlockType !== 'KEY_VALUE_SET' || !block.EntityTypes?.includes('KEY')) continue

      const keyText = getTextForBlock(block, blockMap).toUpperCase().trim()
      if (!keyText.includes('CURP')) continue

      const valueBlockId = (block.Relationships as Relationship[] | undefined)?.find(
        (r: Relationship) => r.Type === 'VALUE'
      )?.Ids?.[0]
      if (!valueBlockId) continue

      const valueBlock = blockMap.get(valueBlockId)
      if (!valueBlock) continue

      const valueText = getTextForBlock(valueBlock, blockMap).toUpperCase().trim()
      const match = CURP_REGEX.exec(valueText)
      if (match) return match[0]
    }

    for (const block of blocks) {
      if (block.BlockType !== 'LINE') continue
      const text = (block.Text ?? '').toUpperCase()
      const match = CURP_REGEX.exec(text)
      if (match) return match[0]
    }

    throw new ValidationError('CURP not found in document')
  } catch (error) {
    if (error instanceof ValidationError) throw error
    throw new Error(
      `Error on analyzeCurpDocument: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
