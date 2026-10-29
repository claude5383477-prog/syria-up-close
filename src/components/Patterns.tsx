import type { PatternId } from '@/lib/cityTheme'

// SVG patterns drawn from Syrian architecture (lib/cityTheme picks one per city). Rendered once per
// page as <PatternDefs/>, then referenced by id from <PatternFill/> and <PatternBand/>.
const C = '#D9A06E'

export function PatternDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }} focusable="false">
      <defs>
        <pattern id="pat-ablaq" width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="14" fill="#E8DCC8" />
          <rect y="14" width="48" height="10" fill="#1C1915" />
          <rect y="24" width="48" height="14" fill="#E8DCC8" />
          <rect y="38" width="48" height="10" fill="#1C1915" />
          <path d="M1 0V48M24 0V14M24 24V38" stroke="#8A5226" strokeWidth="1.5" />
        </pattern>
        <pattern id="pat-star8" width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={C} strokeWidth="2">
            <rect x="16" y="16" width="32" height="32" />
            <rect x="16" y="16" width="32" height="32" transform="rotate(45 32 32)" />
            <circle cx="32" cy="32" r="6" />
            <path d="M0 0L16 16M64 0L48 16M0 64L16 48M64 64L48 48" />
          </g>
        </pattern>
        <pattern id="pat-noria" width="90" height="90" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={C} strokeWidth="2">
            <circle cx="45" cy="45" r="34" />
            <circle cx="45" cy="45" r="6" />
            <path d="M45 11V79M11 45H79M21 21L69 69M69 21L21 69" />
          </g>
          <g fill={C}>
            <rect x="42" y="6" width="6" height="8" />
            <rect x="42" y="76" width="6" height="8" />
            <rect x="6" y="42" width="8" height="6" />
            <rect x="76" y="42" width="8" height="6" />
          </g>
        </pattern>
        <pattern id="pat-cuneiform" width="56" height="40" patternUnits="userSpaceOnUse">
          <g fill={C}>
            <path d="M6 8L16 12L6 16Z" />
            <path d="M22 6L26 18L30 6Z" />
            <path d="M36 10L48 13L36 16Z" />
            <path d="M10 26L14 36L18 26Z" />
            <path d="M26 28L38 31L26 34Z" />
            <path d="M44 24L48 36L52 24Z" />
          </g>
          <path d="M16 12H20M30 13H34M40 31H44" stroke={C} strokeWidth="2" />
        </pattern>
        <pattern id="pat-waves" width="80" height="28" patternUnits="userSpaceOnUse">
          <path d="M0 14Q20 0 40 14T80 14" fill="none" stroke={C} strokeWidth="2.5" />
          <path d="M0 26Q20 12 40 26T80 26" fill="none" stroke={C} strokeWidth="1.2" opacity=".6" />
        </pattern>
        <pattern id="pat-columns" width="60" height="120" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={C} strokeWidth="2">
            <rect x="22" y="18" width="16" height="92" />
            <path d="M16 18H44M18 12H42M16 110H44" />
            <path d="M26 22V106M30 22V106M34 22V106" strokeWidth="1" />
          </g>
        </pattern>
        <pattern id="pat-basalt" width="96" height="48" patternUnits="userSpaceOnUse">
          <rect width="96" height="48" fill="#1C1915" />
          <path d="M0 1H96M0 24H96M40 0V24M88 0V24M16 24V48M64 24V48" fill="none" stroke="#857A6C" strokeWidth="2" />
          <g fill="#645A4E">
            <circle cx="20" cy="10" r="1.6" />
            <circle cx="70" cy="14" r="1.4" />
            <circle cx="38" cy="36" r="1.5" />
            <circle cx="84" cy="34" r="1.2" />
          </g>
        </pattern>
        <pattern id="pat-brick" width="48" height="48" patternUnits="userSpaceOnUse">
          <g fill="#B5713A" stroke="#6B3E1C" strokeWidth="1.5">
            <rect x="1" y="1" width="22" height="10" />
            <rect x="25" y="1" width="10" height="22" />
            <rect x="37" y="13" width="10" height="22" />
            <rect x="1" y="13" width="10" height="22" />
            <rect x="13" y="25" width="22" height="10" />
            <rect x="13" y="37" width="22" height="10" />
            <rect x="37" y="37" width="10" height="10" />
            <rect x="1" y="37" width="10" height="10" />
          </g>
        </pattern>
        <pattern id="pat-byzantine" width="72" height="72" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={C} strokeWidth="2">
            <path d="M8 66V34A28 28 0 0 1 64 34V66" />
            <path d="M20 66V38A16 16 0 0 1 52 38V66" />
            <path d="M36 10V26M28 18H44" />
          </g>
        </pattern>
        <pattern id="pat-roofs" width="80" height="60" patternUnits="userSpaceOnUse">
          <path d="M6 30L26 14L46 30Z" fill="#B5713A" />
          <rect x="10" y="30" width="32" height="22" fill="none" stroke={C} strokeWidth="2" />
          <rect x="22" y="38" width="8" height="14" fill={C} />
          <path d="M54 52L66 22L78 52Z" fill="#357560" />
        </pattern>
      </defs>
    </svg>
  )
}

/** The pattern filling its positioned parent. */
export function PatternFill({ id, opacity = 0.16 }: { id: PatternId; opacity?: number }) {
  return (
    <svg className="pat-fill" aria-hidden="true" focusable="false">
      <rect width="100%" height="100%" fill={`url(#pat-${id})`} opacity={opacity} />
    </svg>
  )
}

/** A decorative strip of the pattern between sections. */
export function PatternBand({ id }: { id: PatternId }) {
  return (
    <svg className="pat-band" aria-hidden="true" focusable="false">
      <rect width="100%" height="100%" fill={`url(#pat-${id})`} opacity=".6" />
    </svg>
  )
}

/* ---------- 2026-10-29: the Syrian pattern library from the light prototype (design/syrian-patterns.svg) ----------
   Twelve patterns, each from a city or monument. Decoration only: every svg is aria-hidden and sits behind text. */

export const SYRIAN_PATTERNS = ['khatam', 'aleppo', 'vine', 'ablaq', 'mash', 'muq', 'palmyra', 'ugarit', 'noria', 'basalt', 'brick', 'kufic'] as const
export type SyrianPatternId = (typeof SYRIAN_PATTERNS)[number]

/** Rendered once per page (in the layout); <SyrianFill/>, <Ablaq/>, <KuficRule/> reference these ids. */
export function SyrianPatternDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }} focusable="false">
      <defs>
        {/* Damascene khatam: the eight-pointed star of the Umayyad Mosque's grilles */}
        <pattern id="syr-khatam" width="72" height="72" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#B5713A" strokeWidth="1.6">
            <rect x="18" y="18" width="36" height="36" />
            <rect x="18" y="18" width="36" height="36" transform="rotate(45 36 36)" />
            <circle cx="36" cy="36" r="7" />
            <path d="M0 0L18 18M72 0L54 18M0 72L18 54M72 72L54 54M36 0V10M36 62V72M0 36H10M62 36H72" />
          </g>
        </pattern>
        {/* Ablaq: alternating basalt and limestone courses (Damascus, Homs) */}
        <pattern id="syr-ablaq" width="40" height="18" patternUnits="userSpaceOnUse">
          <rect width="24" height="18" fill="#E8DCC8" />
          <rect x="24" width="16" height="18" fill="#2B2722" />
        </pattern>
        {/* Umayyad vine scroll */}
        <pattern id="syr-vine" width="120" height="60" patternUnits="userSpaceOnUse">
          <path d="M0 30 C20 6 40 6 60 30 S100 54 120 30" fill="none" stroke="#3F7A5E" strokeWidth="2" />
          <g fill="#3F7A5E" opacity=".75">
            <path d="M30 17 q8 -10 16 -2 q-8 6 -16 2z" />
            <path d="M90 43 q8 10 16 2 q-8 -6 -16 -2z" />
          </g>
          <g fill="#B5713A">
            <circle cx="18" cy="22" r="3" />
            <circle cx="23" cy="25" r="3" />
            <circle cx="17" cy="28" r="3" />
            <circle cx="102" cy="38" r="3" />
            <circle cx="97" cy="35" r="3" />
            <circle cx="103" cy="32" r="3" />
          </g>
        </pattern>
        {/* Mashrabiya: turned-wood lattice */}
        <pattern id="syr-mash" width="28" height="28" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#8A5226" strokeWidth="1.4">
            <circle cx="14" cy="14" r="5" />
            <path d="M14 0V9M14 19V28M0 14H9M19 14H28" />
          </g>
          <circle cx="14" cy="14" r="1.6" fill="#8A5226" />
        </pattern>
        {/* Aleppo star interlace */}
        <pattern id="syr-aleppo" width="90" height="90" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#0B4836" strokeWidth="1.3">
            <rect x="25" y="25" width="40" height="40" />
            <rect x="25" y="25" width="40" height="40" transform="rotate(22.5 45 45)" />
            <rect x="25" y="25" width="40" height="40" transform="rotate(45 45 45)" />
            <rect x="25" y="25" width="40" height="40" transform="rotate(67.5 45 45)" />
            <circle cx="45" cy="45" r="10" />
            <path d="M0 0L14 14M90 0L76 14M0 90L14 76M90 90L76 76" />
          </g>
        </pattern>
        {/* Palmyrene column flutes, bead and reel */}
        <pattern id="syr-palmyra" width="60" height="90" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#B5713A" strokeWidth="1.5">
            <rect x="20" y="14" width="20" height="70" />
            <path d="M14 14H46M16 8H44M14 84H46M25 18V80M30 18V80M35 18V80" />
          </g>
          <g fill="#B5713A">
            <ellipse cx="10" cy="45" rx="3" ry="5" />
            <ellipse cx="50" cy="45" rx="3" ry="5" />
            <circle cx="10" cy="56" r="1.8" />
            <circle cx="50" cy="56" r="1.8" />
          </g>
        </pattern>
        {/* Ugaritic wedges (Latakia) */}
        <pattern id="syr-ugarit" width="56" height="40" patternUnits="userSpaceOnUse">
          <g fill="#8A5226">
            <path d="M6 8L16 12L6 16Z" />
            <path d="M22 6L26 18L30 6Z" />
            <path d="M36 10L48 13L36 16Z" />
            <path d="M10 26L14 36L18 26Z" />
            <path d="M26 28L38 31L26 34Z" />
            <path d="M44 24L48 36L52 24Z" />
          </g>
        </pattern>
        {/* Hama norias */}
        <pattern id="syr-noria" width="90" height="90" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#8A5226" strokeWidth="1.6">
            <circle cx="45" cy="45" r="32" />
            <circle cx="45" cy="45" r="5" />
            <path d="M45 13V77M13 45H77M22 22L68 68M68 22L22 68" />
          </g>
        </pattern>
        {/* Muqarnas niches */}
        <pattern id="syr-muq" width="48" height="42" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#B5713A" strokeWidth="1.3">
            <path d="M0 42V24A12 12 0 0 1 24 24V42M24 42V24A12 12 0 0 1 48 24V42" />
            <path d="M12 21V6A12 12 0 0 1 36 6V21" />
          </g>
        </pattern>
        {/* Hauran basalt (Daraa, Suwayda) */}
        <pattern id="syr-basalt" width="96" height="48" patternUnits="userSpaceOnUse">
          <rect width="96" height="48" fill="#3A342D" />
          <path d="M0 1H96M0 24H96M40 0V24M88 0V24M16 24V48M64 24V48" stroke="#7B7063" strokeWidth="2" />
        </pattern>
        {/* Raqqa Abbasid brick */}
        <pattern id="syr-brick" width="48" height="48" patternUnits="userSpaceOnUse">
          <g fill="#E5C9A6" stroke="#B5713A" strokeWidth="1.2">
            <rect x="1" y="1" width="22" height="10" />
            <rect x="25" y="1" width="10" height="22" />
            <rect x="37" y="13" width="10" height="22" />
            <rect x="1" y="13" width="10" height="22" />
            <rect x="13" y="25" width="22" height="10" />
            <rect x="13" y="37" width="22" height="10" />
            <rect x="37" y="37" width="10" height="10" />
            <rect x="1" y="37" width="10" height="10" />
          </g>
        </pattern>
        {/* Geometric border of square knots, after kufic margins (ornament, no lettering) */}
        <pattern id="syr-kufic" width="56" height="28" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#0B4836" strokeWidth="2.4" strokeLinecap="square">
            <path d="M4 24V4H24V16H12V10M32 4V24H52V12H40V18" />
          </g>
        </pattern>
      </defs>
    </svg>
  )
}

/** A very light pattern behind a page head or a sand band (8–15%, owner brief 2026-10-29). */
export function SyrianFill({ id, opacity = 0.1 }: { id: SyrianPatternId; opacity?: number }) {
  return (
    <svg className="pat-fill" aria-hidden="true" focusable="false">
      <rect width="100%" height="100%" fill={`url(#syr-${id})`} opacity={opacity} />
    </svg>
  )
}

/** The ablaq strip between sections. */
export function Ablaq() {
  return (
    <svg className="ablaq" aria-hidden="true" focusable="false">
      <rect width="100%" height="18" fill="url(#syr-ablaq)" />
    </svg>
  )
}

/** The geometric border above important sections. */
export function KuficRule() {
  return (
    <svg className="kufic" aria-hidden="true" focusable="false">
      <rect width="100%" height="28" fill="url(#syr-kufic)" opacity=".5" />
    </svg>
  )
}

const CORNER = ['tr', 'tl', 'br', 'bl'] as const

/** Copper corners around a cover photo; the parent must be positioned. */
export function CopperCorners() {
  return (
    <>
      {CORNER.map((c) => (
        <svg key={c} className={`corner ${c}`} viewBox="0 0 46 46" aria-hidden="true" focusable="false">
          <path d="M2 44V18A16 16 0 0 1 18 2H44" fill="none" stroke="#B5713A" strokeWidth="2.5" />
          <path d="M10 44V22A12 12 0 0 1 22 10H44" fill="none" stroke="#B5713A" strokeWidth="1.2" />
          <circle cx="18" cy="18" r="3" fill="#B5713A" />
        </svg>
      ))}
    </>
  )
}
