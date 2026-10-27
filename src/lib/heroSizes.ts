/**
 * `sizes` for the hero photos at the top of city and countryside pages.
 *
 * Each photo fills a fixed box with object-fit: cover, so it is drawn at the box width or, when the
 * photo is wider than the box, at box height × aspect ratio (the sides are cropped). Without an exact
 * `sizes` the browser assumes 100vw and downloads a file several times too large; that file was the
 * LCP element on every city page (Lighthouse 2026-10-27).
 *
 * The numbers mirror the CSS: `.wrap` (max 1120px, 16px gutters), `.stage` and its layers
 * (src/styles/site.css), `.trip-pics` (src/styles/v2.css). Change them together.
 */

/** One viewport band: up to `maxVw` (none for the last band), the box width and height. */
type Band = { maxVw?: number; width: { frac: number; minus: number } | { px: number }; height: number }

const CONTENT = 1120 - 32

// City stage: phones ≤700px are 300px tall and full width; it stays full width until the intro (420)
// and the stage (520) fit side by side with the 48px gap (content ≥ 988px, viewport ≥ 1020px), where
// the two share the remaining space: 520 + (1088 - 48 - 940) / 2 = 570px.
const CITY_STAGE = { phone: 300, tall: 460, wrapAt: 1020, desktop: 520 + (CONTENT - 48 - 420 - 520) / 2 }
// Countryside grid (.trip-pics, also .stage): 260px tall on phones, 420px above; columns 1.4fr / 1fr
// with a 12px gap; side by side from viewport 980px (420 + 480 + 48 = 948), then 480 + 70 = 550px.
const RURAL_GRID = { phone: 260, tall: 420, wrapAt: 980, desktop: 480 + (CONTENT - 48 - 420 - 480) / 2, gap: 12 }

function stageLayer(w: number, h: number): Band[] {
  const { phone, tall, wrapAt, desktop } = CITY_STAGE
  return [
    { maxVw: 700, width: { frac: w, minus: 32 }, height: phone * h },
    { maxVw: wrapAt, width: { frac: w, minus: 32 }, height: tall * h },
    { width: { px: desktop * w }, height: tall * h },
  ]
}

function gridCell(col: number, rows: 1 | 2): Band[] {
  const { phone, tall, wrapAt, desktop, gap } = RURAL_GRID
  const cellH = (H: number) => (rows === 2 ? H : (H - gap) / 2)
  return [
    { maxVw: 700, width: { frac: col, minus: 32 + gap }, height: cellH(phone) },
    { maxVw: wrapAt, width: { frac: col, minus: 32 + gap }, height: cellH(tall) },
    { width: { px: (desktop - gap) * col }, height: cellH(tall) },
  ]
}

export const HERO_LAYERS = {
  /** `.stage .l1`: the city cover, 56% × 76%. */
  'city-main': stageLayer(0.56, 0.76),
  /** `.stage .l2`: 46% × 52%. */
  'city-side': stageLayer(0.46, 0.52),
  /** `.stage .l3`: 58% × 62%. */
  'city-back': stageLayer(0.58, 0.62),
  /** `.trip-pics .p1`: first column (1.4fr of 2.4), both rows. */
  'rural-main': gridCell(1.4 / 2.4, 2),
  /** `.trip-pics .p2` / `.p3`: second column (1fr of 2.4), one row each. */
  'rural-side': gridCell(1 / 2.4, 1),
} satisfies Record<string, Band[]>

export type HeroLayer = keyof typeof HERO_LAYERS

const round4 = (n: number) => Math.round(n * 10000) / 10000

/**
 * The `sizes` attribute for a hero photo of the given aspect ratio (width / height). Unknown sizes count
 * as 3:2, the usual camera frame, so a landscape photo is never starved.
 */
export function heroSizes(layer: HeroLayer, aspect: number | null | undefined): string {
  const a = aspect && Number.isFinite(aspect) && aspect > 0 ? aspect : 1.5
  return HERO_LAYERS[layer]
    .map((b) => {
      const drawnByHeight = Math.round(b.height * a)
      const value =
        'px' in b.width
          ? `${Math.max(Math.round(b.width.px), drawnByHeight)}px`
          : `max(calc((100vw - ${b.width.minus}px) * ${round4(b.width.frac)}), ${drawnByHeight}px)`
      return b.maxVw ? `(max-width: ${b.maxVw}px) ${value}` : value
    })
    .join(', ')
}
