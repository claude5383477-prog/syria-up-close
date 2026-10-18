import { createRequire } from 'node:module'
import sharp, { type OverlayOptions } from 'sharp'

// Branded Open Graph images (1200×630) rendered with sharp/Pango, which shapes Arabic correctly
// (Next's ImageResponse/Satori does not join Arabic letters). Uses IBM Plex Sans Arabic when the
// @ibm/plex-sans-arabic package is installed; otherwise a system Arabic font (Noto/Tahoma).

const W = 1200
const H = 630
const C = { green: '#0B4836', sand: '#E8DCC8', muted: '#98BBAD', copper: '#D9A06E', mark: '#B5713A' }

function brandFont(weight: 'Bold' | 'Regular'): { fontfile?: string; family: string } {
  try {
    const require = createRequire(import.meta.url)
    const file = require.resolve(`@ibm/plex-sans-arabic/fonts/complete/ttf/IBMPlexSansArabic-${weight}.ttf`)
    return { fontfile: file, family: 'IBM Plex Sans Arabic' }
  } catch {
    return { family: 'Noto Sans Arabic, Tahoma, sans-serif' }
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type TextOpts = { size: number; color: string; width: number; bold?: boolean; maxLines?: number }

async function renderText(text: string, opts: TextOpts) {
  const font = brandFont(opts.bold ? 'Bold' : 'Regular')
  const input = await sharp({
    text: {
      text: `<span foreground="${opts.color}">${esc(text)}</span>`,
      font: `${font.family} ${opts.bold ? 'Bold' : ''} ${opts.size}`,
      ...(font.fontfile ? { fontfile: font.fontfile } : {}),
      width: opts.width,
      align: 'right',
      rgba: true,
      dpi: 72,
      wrap: 'word',
      spacing: Math.round(opts.size * 0.5),
    },
  })
    .png()
    .toBuffer()
  const meta = await sharp(input).metadata()
  return { input, width: meta.width ?? opts.width, height: meta.height ?? 0 }
}

/** Shaped, wrapped text; if it needs more than maxLines, words are dropped from the end and "…" added. */
async function textImage(text: string, opts: TextOpts) {
  const maxH = Math.round(opts.size * 1.6 * (opts.maxLines ?? 3))
  let words = text.trim().split(/\s+/)
  let img = await renderText(words.join(' '), opts)
  while (img.height > maxH && words.length > 1) {
    words = words.slice(0, -1)
    img = await renderText(`${words.join(' ')}…`, opts)
  }
  return img
}

/** The focus-ring logo (same geometry as components/Logo). */
function markSvg(size: number): string {
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = (i * 5 * Math.PI) / 180
    const long = i % 6 === 0
    const r1 = long ? 42 : 44
    const p = (r: number) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`
    return `<path d="M${p(r1)} L${p(49)}" stroke="${C.sand}" stroke-width="${long ? 2.4 : 1.4}" stroke-linecap="round"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-58 -58 116 116">${ticks}
    <circle r="38" fill="none" stroke="${C.sand}" stroke-width="3.5"/><circle r="31" fill="none" stroke="${C.sand}" stroke-width="1" opacity=".55"/>
    <circle r="4.5" fill="${C.mark}"/><path d="M-4.5 -57 L4.5 -57 L0 -51 Z" fill="${C.mark}" transform="rotate(-38)"/></svg>`
}

export type OgCard = { kicker?: string; title: string; subtitle?: string }

export async function renderOg({ kicker, title, subtitle }: OgCard): Promise<Buffer> {
  const pad = 72
  const textW = 760
  const right = W - pad
  const parts: OverlayOptions[] = [{ input: Buffer.from(markSvg(300)), left: pad - 10, top: (H - 300) / 2 }]

  let y = 120
  if (kicker) {
    const k = await textImage(kicker, { size: 30, color: C.copper, width: textW, bold: true, maxLines: 1 })
    parts.push({ input: k.input, left: right - k.width, top: y })
    y += k.height + 18
  }
  const t = await textImage(title, { size: 64, color: C.sand, width: textW, bold: true, maxLines: 3 })
  parts.push({ input: t.input, left: right - t.width, top: y })
  y += t.height + 24
  const brand = await textImage('سوريا عن قرب · SYRIA UP CLOSE', { size: 26, color: C.sand, width: textW, bold: true, maxLines: 1 })
  const brandTop = H - pad - brand.height
  if (subtitle) {
    const s = await textImage(subtitle, { size: 30, color: C.muted, width: textW, maxLines: 2 })
    // Only when it fits above the brand line; a long title wins over the subtitle.
    if (y + s.height <= brandTop - 20) parts.push({ input: s.input, left: right - s.width, top: y })
  }
  parts.push({ input: brand.input, left: right - brand.width, top: brandTop })

  return sharp({ create: { width: W, height: H, channels: 3, background: C.green } }).composite(parts).png().toBuffer()
}

export const OG_SIZE = { width: W, height: H }
