import {
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
  TextractClient,
  type Block,
  type Relationship,
} from '@aws-sdk/client-textract'
import { ValidationError } from '../../../../shared/constants/errors'
import type { BankData } from '../types/BankData'

const textractClient = new TextractClient({})

const startAndPollAnalysis = async (bucket: string, key: string): Promise<Block[]> => {
  const { JobId } = await textractClient.send(
    new StartDocumentAnalysisCommand({
      DocumentLocation: { S3Object: { Bucket: bucket, Name: key } },
      FeatureTypes: ['FORMS'],
    })
  )

  if (!JobId) throw new Error('Textract did not return a JobId')

  while (true) {
    const status = await textractClient.send(new GetDocumentAnalysisCommand({ JobId }))
    if (status.JobStatus === 'FAILED') {
      throw new Error(`Textract job failed: ${status.StatusMessage ?? 'unknown'}`)
    }
    if (status.JobStatus === 'SUCCEEDED') break
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  const allBlocks: Block[] = []
  let nextToken: string | undefined
  do {
    const page = await textractClient.send(
      new GetDocumentAnalysisCommand({ JobId, NextToken: nextToken })
    )
    allBlocks.push(...(page.Blocks ?? []))
    nextToken = page.NextToken
  } while (nextToken)

  return allBlocks
}

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

const rfcPresentInDocument = (blocks: Block[], rfcBase: string): boolean => {
  const rfcRegex = new RegExp(rfcBase + '[A-Z\\d]{0,3}', 'i')
  const allText = blocks
    .filter((b) => b.BlockType === 'LINE')
    .map((b) => b.Text ?? '')
    .join('\n')
  return rfcRegex.test(allText)
}

// Extract CLABE (18 digits) or account number from lines near CUENTA/CLABE keywords.
// Strips spaces/separators so "012 180 01521329126 6" → "012180015213291266".
const extractAccountFromLines = (blocks: Block[]): string | undefined => {
  const lines = blocks
    .filter((b: Block) => b.BlockType === 'LINE')
    .map((b: Block) => b.Text?.trim() ?? '')
    .filter((t) => t.length > 0)

  for (let i = 0; i < lines.length; i++) {
    const upper = lines[i].toUpperCase()
    if (upper.includes('CLABE') || upper.includes('CUENTA') || upper.includes('NO.') || upper.includes('NÚMERO')) {
      const combined = lines.slice(i, i + 3).join(' ')
      const digits = combined.replace(/\D/g, '')
      if (digits.length === 18) return digits
      if (digits.length >= 10 && digits.length <= 17) return digits
    }
  }

  // Last resort: first 18-digit sequence in the whole document
  for (const line of lines) {
    const digits = line.replace(/\D/g, '')
    if (digits.length === 18) return digits
  }

  return undefined
}

const extractAccountFromKv = (kvPairs: Record<string, string>): string | undefined => {
  const candidates = ['CLABE', 'CUENTA', 'NÚMERO DE CUENTA', 'NUMERO DE CUENTA', 'NO. DE CUENTA']
  for (const candidate of candidates) {
    const entry = Object.entries(kvPairs).find(([k]) => k.includes(candidate))
    if (entry) return entry[1].replace(/\D/g, '') || undefined
  }
  return undefined
}

export const analyzeBankDocument = async (
  bucket: string,
  key: string,
  rfcBase: string
): Promise<BankData> => {
  try {
    const blocks = await startAndPollAnalysis(bucket, key)
    const blockMap = new Map<string, Block>(blocks.map((b: Block) => [b.Id ?? '', b]))
    const kvPairs: Record<string, string> = {}

    for (const block of blocks) {
      if (block.BlockType !== 'KEY_VALUE_SET' || !block.EntityTypes?.includes('KEY')) continue

      const keyText = getTextForBlock(block, blockMap).toUpperCase().trim()
      const valueBlockId = (block.Relationships as Relationship[] | undefined)?.find(
        (r: Relationship) => r.Type === 'VALUE'
      )?.Ids?.[0]
      if (!valueBlockId) continue

      const valueBlock = blockMap.get(valueBlockId)
      if (!valueBlock) continue

      kvPairs[keyText] = getTextForBlock(valueBlock, blockMap).trim()
    }

    if (!rfcPresentInDocument(blocks, rfcBase)) {
      throw new ValidationError('RFC not found in bank statement')
    }

    const numeroCuenta = extractAccountFromKv(kvPairs) ?? extractAccountFromLines(blocks)

    if (!numeroCuenta) {
      throw new ValidationError('Missing required bank fields: numeroCuenta')
    }

    return { numeroCuenta }
  } catch (error) {
    if (error instanceof ValidationError) throw error
    throw new Error(
      `Error on analyzeBankDocument: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
