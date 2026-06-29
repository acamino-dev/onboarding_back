export const normalizeNameForComparison = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z\s]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
