import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { woff2Cmap } from '../helpers/woff2'

// Every character the site can render in Arabic text must exist in the subset brand font
// (scripts/fonts/subset.py). Collects the text of string literals, templates and JSX in src/
// (site copy, seed data, admin labels); comments are ignored.

const FONTS = ['400', '600', '700'].map((w) => `public/fonts/plex-arabic-${w}.v1.woff2`)

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === 'migrations' ? [] : files(p)
    return /\.(tsx?|mts)$/.test(name) && !name.endsWith('payload-types.ts') ? [p] : []
  })
}

function visibleText(path: string): string[] {
  const src = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const out: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
      out.push(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(src)
  return out
}

/** Characters with Arabic script presence in the same string are the ones the Arabic font renders. */
function usedCharacters(): Map<number, string> {
  const seen = new Map<number, string>()
  for (const f of files('src')) {
    for (const s of visibleText(f)) {
      for (const ch of s) {
        const cp = ch.codePointAt(0)!
        if (cp < 0x20 || seen.has(cp)) continue
        seen.set(cp, `${relative('.', f)}: ${JSON.stringify(s.slice(0, 40))}`)
      }
    }
  }
  return seen
}

describe('subset brand font coverage', () => {
  const used = usedCharacters()

  it('finds the site copy (sanity check)', () => {
    expect(used.has('ض'.codePointAt(0)!)).toBe(true)
    expect(used.has('٦'.codePointAt(0)!) || used.has('،'.codePointAt(0)!)).toBe(true)
    expect(used.size).toBeGreaterThan(60)
  })

  for (const font of FONTS) {
    it(`${font} contains every character used in site text and seed data`, () => {
      const cmap = woff2Cmap(readFileSync(font))
      const missing = [...used].filter(([cp]) => !cmap.has(cp)).map(([cp, where]) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')} ${String.fromCodePoint(cp)}  (${where})`)
      expect(missing).toEqual([])
    })
  }

  it('reads the real cmap: 360 code points (matches fonttools), nothing outside the subset', () => {
    const cmap = woff2Cmap(readFileSync(FONTS[0]!))
    expect(cmap.size).toBe(360)
    expect(cmap.has(0x0436)).toBe(false) // Cyrillic ж: deliberately not in the subset
  })

  it('keeps Arabic-Indic and Extended Arabic-Indic digits and Arabic punctuation', () => {
    const cmap = woff2Cmap(readFileSync(FONTS[0]!))
    for (const ch of '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹0123456789،؛؟٪') expect(cmap.has(ch.codePointAt(0)!), ch).toBe(true)
  })
})
