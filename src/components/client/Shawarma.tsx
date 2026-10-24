'use client'

import { useState } from 'react'

/** The home page's drawn shawarma spit: press it and a wrapped sandwich pops out. */
export function Shawarma({ make, again, hint, hintDone, said }: { make: string; again: string; hint: string; hintDone: string; said: string }) {
  const [wrapped, setWrapped] = useState(false)
  const stripes = (ys: number[]) => ys.map((y) => `M60 ${y} Q200 ${y - 14} 340 ${y}`).join(' ')
  return (
    <div className="shw-wrap">
      <button type="button" className="shw" onClick={() => setWrapped(!wrapped)} aria-label={wrapped ? again : make} aria-pressed={wrapped}>
        <svg viewBox="0 0 420 420" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id="cone-clip">
              <path d="M138 92 Q200 74 262 92 L232 300 Q200 310 168 300 Z" />
            </clipPath>
          </defs>
          <circle cx="210" cy="210" r="168" fill="#F3ECE0" />
          <rect x="276" y="70" width="46" height="250" rx="14" fill="#3D3830" />
          <g className="glow">
            {[92, 130, 168, 206, 244, 282].map((y, i) => (
              <rect key={y} x="286" y={y} width="26" height="8" rx="4" fill={i % 2 ? '#B5713A' : '#D9A06E'} />
            ))}
          </g>
          <rect x="196" y="42" width="8" height="300" rx="4" fill="#645A4E" />
          <path d="M138 92 Q200 74 262 92 L232 300 Q200 310 168 300 Z" fill="#B5713A" />
          <g clipPath="url(#cone-clip)">
            <g className="turn">
              <path d={stripes([110, 140, 172, 204, 236, 268])} stroke="#8A5226" strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray="26 18" />
              <path d={stripes([124, 188, 252])} stroke="#6B3E1C" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="10 34" />
              <path d={stripes([156, 220])} stroke="#D9A06E" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="14 30" />
            </g>
          </g>
          <path d="M248 96 L222 296" stroke="#6B3E1C" strokeWidth="10" strokeLinecap="round" opacity=".35" />
          <ellipse cx="200" cy="90" rx="62" ry="12" fill="#8A5226" />
          <ellipse cx="200" cy="80" rx="24" ry="9" fill="#FAF6EF" />
          <ellipse cx="200" cy="74" rx="14" ry="7" fill="#C2410C" />
          <ellipse cx="200" cy="336" rx="96" ry="16" fill="#645A4E" />
          <ellipse cx="200" cy="330" rx="80" ry="10" fill="#857A6C" />
          <circle className="drip" cx="186" cy="306" r="4" fill="#8A5226" />
          <circle className="drip late" cx="214" cy="308" r="3" fill="#8A5226" />
          <g className="steam">
            <path d="M160 60 q-10 -16 0 -32" />
            <path d="M206 50 q-10 -16 0 -32" />
            <path d="M240 60 q-10 -16 0 -32" />
          </g>
        </svg>
        {wrapped && (
          <>
            <svg className="pop sandwich" viewBox="0 0 240 120" aria-hidden="true" focusable="false">
              <g transform="rotate(-14 120 60)">
                <ellipse cx="120" cy="104" rx="100" ry="10" fill="rgba(61,56,48,.25)" />
                <rect x="20" y="30" width="200" height="64" rx="32" fill="#E8C48A" />
                <rect x="70" y="26" width="150" height="72" rx="10" fill="#FFFFFF" />
                <path d="M70 40 H220 M70 84 H220" stroke="#B5713A" strokeWidth="4" />
                <ellipse cx="26" cy="62" rx="16" ry="30" fill="#F3D9A8" />
                <circle cx="22" cy="50" r="7" fill="#8A5226" />
                <circle cx="30" cy="66" r="6" fill="#6B3E1C" />
                <rect x="14" y="70" width="14" height="6" rx="3" fill="#6B8F3A" />
                <circle cx="20" cy="60" r="4" fill="#FFFFFF" />
                <circle cx="32" cy="54" r="3.5" fill="#FFFFFF" />
              </g>
            </svg>
            <span className="pop said">{said}</span>
          </>
        )}
      </button>
      <span className="shw-hint" aria-live="polite">
        {wrapped ? hintDone : hint}
      </span>
    </div>
  )
}
