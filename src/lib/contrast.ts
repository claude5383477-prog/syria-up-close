// WCAG 2.x relative luminance and contrast ratio, plus a tiny parser for src/styles/tokens.css.

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) throw new Error(`Expected a hex colour, got "${hex}"`)
  const h = m[1]!.length === 3 ? [...m[1]!].map((d) => d + d).join('') : m[1]!
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16))) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

type Tokens = Record<string, string>

function declarations(body: string): Tokens {
  const out: Tokens = {}
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim()
  return out
}

function blockAfter(css: string, selector: string): string {
  const start = css.indexOf(selector)
  if (start < 0) throw new Error(`Selector not found: ${selector}`)
  const open = css.indexOf('{', start + selector.length)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i)
  }
  throw new Error(`Unclosed block: ${selector}`)
}

/** Resolves the light, [data-theme="dark"] and prefers-color-scheme dark token sets; dark sets inherit light values. */
export function parseTokenBlocks(css: string): { light: Tokens; dark: Tokens; darkMedia: Tokens } {
  const light = declarations(blockAfter(css, ':root {'))
  const dark = { ...light, ...declarations(blockAfter(css, ':root[data-theme="dark"]')) }
  const media = blockAfter(css, '@media (prefers-color-scheme: dark)')
  const darkMedia = { ...light, ...declarations(blockAfter(media, ':root:not([data-theme="light"])')) }
  return { light, dark, darkMedia }
}
