// Minimal WOFF2 reader: returns the set of code points in the font's cmap.
// Enough for coverage tests; uses Node's built-in Brotli (no font library needed).
import { brotliDecompressSync } from 'node:zlib'

const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT',
  'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH',
  'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar',
  'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
]

function base128(buf: Buffer, pos: { at: number }): number {
  let v = 0
  for (let i = 0; i < 5; i++) {
    const b = buf[pos.at++]!
    v = (v << 7) | (b & 0x7f)
    if (!(b & 0x80)) return v >>> 0
  }
  throw new Error('bad UIntBase128')
}

export function woff2Cmap(file: Buffer): Set<number> {
  if (file.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not a WOFF2 file')
  const numTables = file.readUInt16BE(12)
  const compressedSize = file.readUInt32BE(20)
  const pos = { at: 48 }
  const tables: { tag: string; length: number }[] = []
  for (let i = 0; i < numTables; i++) {
    const flags = file[pos.at++]!
    const tag = (flags & 0x3f) === 63 ? file.toString('latin1', pos.at, (pos.at += 4)) : KNOWN_TAGS[flags & 0x3f]!
    const version = flags >> 6
    const origLength = base128(file, pos)
    const transformed = tag === 'glyf' || tag === 'loca' ? version !== 3 : version !== 0
    tables.push({ tag, length: transformed ? base128(file, pos) : origLength })
  }
  const data = brotliDecompressSync(file.subarray(pos.at, pos.at + compressedSize))
  let offset = 0
  for (const t of tables) {
    if (t.tag === 'cmap') return parseCmap(data.subarray(offset, offset + t.length))
    offset += t.length
  }
  throw new Error('no cmap table')
}

function parseCmap(t: Buffer): Set<number> {
  const out = new Set<number>()
  const n = t.readUInt16BE(2)
  for (let i = 0; i < n; i++) {
    const off = t.readUInt32BE(4 + i * 8 + 4)
    const format = t.readUInt16BE(off)
    if (format === 4) {
      const segX2 = t.readUInt16BE(off + 6)
      const ends = off + 14
      const starts = ends + segX2 + 2
      const deltas = starts + segX2
      const ranges = deltas + segX2
      for (let s = 0; s < segX2 / 2; s++) {
        const end = t.readUInt16BE(ends + s * 2)
        const start = t.readUInt16BE(starts + s * 2)
        const delta = t.readInt16BE(deltas + s * 2)
        const rangeOff = t.readUInt16BE(ranges + s * 2)
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const glyph = rangeOff === 0 ? (c + delta) & 0xffff : t.readUInt16BE(ranges + s * 2 + rangeOff + (c - start) * 2)
          if (glyph !== 0) out.add(c)
        }
      }
    } else if (format === 12) {
      const groups = t.readUInt32BE(off + 12)
      for (let g = 0; g < groups; g++) {
        const start = t.readUInt32BE(off + 16 + g * 12)
        const end = t.readUInt32BE(off + 20 + g * 12)
        for (let c = start; c <= end; c++) out.add(c)
      }
    }
  }
  return out
}
