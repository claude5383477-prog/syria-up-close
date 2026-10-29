import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp, { type OverlayOptions } from 'sharp'

// Branded Open Graph images (1200×630) rendered with sharp/Pango, which shapes Arabic correctly
// (Next's ImageResponse/Satori does not join Arabic letters), in the brand font IBM Plex Sans Arabic.

const W = 1200
const H = 630
// Light identity (2026-10-29): paper background, green text and lens, copper details.
const C = { bg: '#FBF8F2', ink: '#0B4836', sand: '#E8DCC8', muted: '#5E554A', copper: '#8A5226', mark: '#B5713A' }

/** The site's own subset of IBM Plex Sans Arabic (scripts/fonts/subset.py); system Arabic font if missing. */
function brandFont(weight: 'Bold' | 'Regular'): { fontfile?: string; family: string } {
  const file = path.join(process.cwd(), 'src/og/fonts', `plex-arabic-${weight === 'Bold' ? 700 : 400}.ttf`)
  return existsSync(file) ? { fontfile: file, family: 'IBM Plex Sans Arabic' } : { family: 'Noto Sans Arabic, Tahoma, sans-serif' }
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
  // Measure one line in this font rather than assuming a line height (Plex Arabic lines are tall).
  const lines = opts.maxLines ?? 3
  // Sample with tall letters, descenders, marks and Latin, so a measured line is a real line.
  const sample = 'إلى أيّ جيّ gyH'
  const twoLines = (await renderText(`${sample}\n${sample}`, opts)).height
  const oneLine = (await renderText(sample, opts)).height
  const maxH = oneLine + (twoLines - oneLine) * (lines - 1) + 2
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
    return `<path d="M${p(r1)} L${p(49)}" stroke="${C.ink}" stroke-width="${long ? 2.4 : 1.4}" stroke-linecap="round"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-58 -58 116 116">${ticks}
    <circle r="38" fill="none" stroke="${C.ink}" stroke-width="3.5"/><circle r="31" fill="none" stroke="${C.ink}" stroke-width="1" opacity=".55"/>
    <circle r="4.5" fill="${C.mark}"/><path d="M-4.5 -57 L4.5 -57 L0 -51 Z" fill="${C.mark}" transform="rotate(-38)"/></svg>`
}

export type OgCard = { kicker?: string; title: string; subtitle?: string }

// One render at a time per process, on one libvips thread: Pango text with a font file crashed with
// heap corruption (0xC0000374) on Windows under load (unit tests with coverage: 1 run in 10 before,
// 0 in 40 after). concurrency(1) is process-wide, so upload resizing is single-threaded too; photos
// arrive already compressed by the browser, and cards are small and rare.
let queue: Promise<unknown> = Promise.resolve()
sharp.concurrency(1)

export function renderOg(card: OgCard): Promise<Buffer> {
  const run = queue.then(() => renderCard(card))
  queue = run.catch(() => undefined)
  return run
}

async function renderCard({ kicker, title, subtitle }: OgCard): Promise<Buffer> {
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
  const t = await textImage(title, { size: 64, color: C.ink, width: textW, bold: true, maxLines: 3 })
  parts.push({ input: t.input, left: right - t.width, top: y })
  y += t.height + 24
  const brand = await textImage('سوريا عن قرب · SYRIA UP CLOSE', { size: 26, color: C.ink, width: textW, bold: true, maxLines: 1 })
  const brandTop = H - pad - brand.height
  if (subtitle) {
    const s = await textImage(subtitle, { size: 30, color: C.muted, width: textW, maxLines: 2 })
    // Only when it fits above the brand line; a long title wins over the subtitle.
    if (y + s.height <= brandTop - 20) parts.push({ input: s.input, left: right - s.width, top: y })
  }
  parts.push({ input: brand.input, left: right - brand.width, top: brandTop })
  // Ablaq band along the bottom edge: the brand's alternating stone courses.
  const band = Array.from({ length: Math.ceil(W / 64) }, (_, i) => `<rect x="${i * 64}" y="3" width="40" height="16" fill="${C.sand}"/><rect x="${i * 64 + 40}" y="3" width="24" height="16" fill="#1C1915"/>`).join('')
  parts.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="22"><rect width="${W}" height="22" fill="${C.mark}"/>${band}</svg>`), left: 0, top: H - 22 })

  return sharp({ create: { width: W, height: H, channels: 3, background: C.bg } }).composite(parts).png().toBuffer()
}

export const OG_SIZE = { width: W, height: H }

/**
 * Cards are rendered on request (never at build), so the CDN must keep them: s-maxage lets Vercel's
 * edge cache serve a card for an hour, then keep serving it while one request renders a fresh one.
 * The default card never changes, so it is kept for a day.
 */
export const OG_CACHE = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
export const OG_CACHE_STATIC = 'public, max-age=86400, s-maxage=86400'
