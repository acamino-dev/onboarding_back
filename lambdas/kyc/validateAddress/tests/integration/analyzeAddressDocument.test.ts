import {
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
  TextractClient,
  type Block,
  type Relationship,
} from '@aws-sdk/client-textract'
import { analyzeAddressDocument } from '../../services/analyzeAddressDocument'

const BUCKET = 'acamino-file-system-dev'
const KEY = 'onboarding/2026/06/28/1b187669-a0a0-4f2a-9fff-cf64530ac093/ADDRESS.jpeg'

const pad = (s: string, n: number): string => s.slice(0, n).padEnd(n)

const printTable = (headers: string[], rows: string[][]): void => {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length))
  )
  const divider = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`
  const fmt = (cells: string[]): string =>
    `|${cells.map((c, i) => ` ${pad(c ?? '', widths[i])} `).join('|')}|`
  const lines = [divider, fmt(headers), divider, ...rows.map(fmt), divider]
  console.log(lines.join('\n'))
}

const startAndPollAnalysis = async (client: TextractClient): Promise<Block[]> => {
  const { JobId } = await client.send(
    new StartDocumentAnalysisCommand({
      DocumentLocation: { S3Object: { Bucket: BUCKET, Name: KEY } },
      FeatureTypes: ['FORMS'],
    })
  )
  if (!JobId) throw new Error('No JobId returned')

  while (true) {
    const status = await client.send(new GetDocumentAnalysisCommand({ JobId }))
    if (status.JobStatus === 'FAILED') throw new Error(`Job failed: ${status.StatusMessage}`)
    if (status.JobStatus === 'SUCCEEDED') break
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  const allBlocks: Block[] = []
  let nextToken: string | undefined
  do {
    const page = await client.send(new GetDocumentAnalysisCommand({ JobId, NextToken: nextToken }))
    allBlocks.push(...(page.Blocks ?? []))
    nextToken = page.NextToken
  } while (nextToken)

  return allBlocks
}

describe('analyzeAddressDocument integration', () => {
  it('prints Textract blocks and service extraction as tables', async () => {
    const client = new TextractClient({})
    const blocks = await startAndPollAnalysis(client)
    const blockMap = new Map<string, Block>(blocks.map((b) => [b.Id ?? '', b]))

    const getChildText = (block: Block): string =>
      (block.Relationships as Relationship[] | undefined)
        ?.filter((r) => r.Type === 'CHILD')
        .flatMap((r) => r.Ids ?? [])
        .map((id) => blockMap.get(id))
        .filter((b): b is Block => b?.BlockType === 'WORD')
        .map((b) => b.Text ?? '')
        .join(' ') ?? ''

    // ── Tabla 1: LINE blocks ──────────────────────────────────────────────
    console.log('\nLINE BLOCKS')
    const lineRows = blocks
      .filter((b) => b.BlockType === 'LINE')
      .map((b) => {
        const words = (b.Relationships as Relationship[] | undefined)
          ?.filter((r) => r.Type === 'CHILD')
          .flatMap((r) => r.Ids ?? [])
          .map((id) => blockMap.get(id))
          .filter((w): w is Block => w?.BlockType === 'WORD')
          .map((w) => `${w.Text}(${w.Confidence?.toFixed(0)}%)`)
          .join('  ') ?? ''
        return [b.Text ?? '', `${b.Confidence?.toFixed(1)}%`, words]
      })
    printTable(['Texto línea', 'Conf%', 'Palabras (word, confianza)'], lineRows)

    // ── Tabla 2: KV pairs ────────────────────────────────────────────────
    console.log('\nKEY-VALUE PAIRS')
    const kvRows: string[][] = []
    for (const block of blocks) {
      if (block.BlockType !== 'KEY_VALUE_SET' || !block.EntityTypes?.includes('KEY')) continue
      const keyText = getChildText(block).toUpperCase().trim()
      const valueBlockId = (block.Relationships as Relationship[])?.find(
        (r) => r.Type === 'VALUE'
      )?.Ids?.[0]
      const valueBlock = valueBlockId ? blockMap.get(valueBlockId) : undefined
      const valueText = valueBlock ? getChildText(valueBlock).trim() : ''
      const keyConf = block.Confidence?.toFixed(1) ?? '-'
      const valConf = valueBlock?.Confidence?.toFixed(1) ?? '-'
      kvRows.push([keyText, `${keyConf}%`, valueText, `${valConf}%`])
    }
    printTable(['KEY', 'Conf%', 'VALUE', 'Conf%'], kvRows)

    // ── Tabla 3: extracción del servicio ─────────────────────────────────
    console.log('\nEXTRACCIÓN DEL SERVICIO')
    let result: string | undefined
    let serviceError = ''
    try {
      result = await analyzeAddressDocument(BUCKET, KEY)
    } catch (e) {
      serviceError = e instanceof Error ? e.message : String(e)
    }

    const extractionRows = [
      ['domicilio', 'DOMICILIO / DIRECCIÓN / DIRECCION', result ?? `ERROR: ${serviceError}`],
    ]
    printTable(['Campo', 'Candidatos buscados', 'Valor extraído'], extractionRows)

    expect(result).toBeDefined()
    expect(result!.length).toBeGreaterThan(0)
  }, 60000)

  it('throws wrapped Error when bucket does not exist', async () => {
    await expect(
      analyzeAddressDocument('nonexistent-bucket-xyz', 'onboarding/test/ADDRESS.pdf')
    ).rejects.toThrow(/Error on analyzeAddressDocument/)
  }, 30000)

  it('throws wrapped Error when s3 key does not exist', async () => {
    await expect(
      analyzeAddressDocument(BUCKET, 'onboarding/nonexistent/ADDRESS.pdf')
    ).rejects.toThrow(/Error on analyzeAddressDocument/)
  }, 30000)
})
