export const mergeCookies = (base: string, extra: string): string => {
  if (!extra) return base
  if (!base) return extra
  const map = new Map<string, string>()
  for (const c of [...base.split('; '), ...extra.split('; ')]) {
    const name = c.split('=')[0]
    if (name) map.set(name, c)
  }
  return [...map.values()].join('; ')
}
