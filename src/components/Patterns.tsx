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
