export const normalizeAddress = (address: string): string =>
  address
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9\s]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()

// Short words (≤2 chars) are noise — articles, prepositions, etc.
const isSignificantToken = (token: string): boolean => token.length > 2

export const addressesMatch = (kycAddress: string, documentAddress: string): boolean => {
  const normalizedKyc = normalizeAddress(kycAddress)
  const normalizedDoc = normalizeAddress(documentAddress)

  if (normalizedKyc === normalizedDoc) return true

  const kycTokens = normalizedKyc.split(' ').filter(isSignificantToken)
  const docTokenSet = new Set(normalizedDoc.split(' ').filter(isSignificantToken))

  if (kycTokens.length === 0) return false

  const matchCount = kycTokens.filter((t) => docTokenSet.has(t)).length
  return matchCount / kycTokens.length >= 0.6
}
