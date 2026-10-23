'use client'

import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'

type Zoom = { label: string; text: string; view: string; scale: number; bg: string; fg: string }

/** The idea in motion: a lens that moves from far away to up close as you press the levels. */
export function Lens({ levels, label }: { levels: Zoom[]; label: string }) {
  const [z, setZ] = useState(levels.length - 1)
  const [t, setT] = useState({ x: 0, y: 0 })
  const lv = levels[z]!
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    setT({ x: ((e.clientX - r.left) / r.width - 0.5) * 30, y: ((e.clientY - r.top) / r.height - 0.5) * -22 })
  }
  return (
    <div className="split" onPointerMove={move} onPointerLeave={() => setT({ x: 0, y: 0 })}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="pills" role="group" aria-label={label}>
          {levels.map((l, i) => (
            <button key={l.label} type="button" className="pill" aria-pressed={i === z} onClick={() => setZ(i)}>
              {l.label}
            </button>
          ))}
        </div>
        <p aria-live="polite" style={{ minHeight: 60, color: 'var(--band-fg)' }}>
          {lv.text}
        </p>
      </div>
      <div className="lens-stage g-anim">
        <div className="lens" style={{ '--rx': `${t.y}deg`, '--ry': `${t.x}deg`, '--lz': `${z * 30}px` } as CSSProperties}>
          <span className="r1" />
          <span className="r2" />
          <span className="r3" />
          <span className="view">
            <span style={{ '--zoom': lv.scale, background: lv.bg, color: lv.fg } as CSSProperties}>{lv.view}</span>
          </span>
          <span className="dotc" />
        </div>
      </div>
    </div>
  )
}

/** Promise cards that flip over to show how each promise is kept. */
export function FlipCards({ cards, hint }: { cards: { title: string; back: string }[]; hint: string }) {
  const [flipped, setFlipped] = useState(-1)
  return (
    <div className="grid g4">
      {cards.map((c, i) => (
        <button key={c.title} type="button" className="flip g-anim" aria-pressed={i === flipped} onClick={() => setFlipped(i === flipped ? -1 : i)}>
          <span>
            <span className="face front" aria-hidden={i === flipped}>
              <small>{String(i + 1).padStart(2, '0')}</small>
              <b>{c.title}</b>
              <span>{hint}</span>
            </span>
            <span className="face back" aria-hidden={i !== flipped}>
              <b>{c.title}</b>
              <span>{c.back}</span>
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

/** How we check: three stacked plates; pressing one raises it and highlights its step. */
export function Steps({ steps }: { steps: { title: string; text: string; bg: string; fg: string }[] }) {
  const [on, setOn] = useState(0)
  return (
    <div className="split">
      <div className="stairs g-anim" aria-hidden="true">
        <div>
          {steps.map((s, i) => (
            <button key={s.title} type="button" tabIndex={-1} aria-pressed={i === on} onClick={() => setOn(i)} style={{ '--i': i, background: s.bg, color: s.fg } as CSSProperties}>
              {String(i + 1).padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>
      <div className="steps-list">
        {steps.map((s, i) => (
          <button key={s.title} type="button" aria-pressed={i === on} onClick={() => setOn(i)}>
            <b>
              {String(i + 1).padStart(2, '0')} · {s.title}
            </b>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

type Bubble = { id: number; x: number; y: number; size: number; delay: number }

/**
 * "Try Aleppo laurel soap": press the bar for lather, then rub the tile clean with a mouse or a
 * finger. Touch and pen only rub while pressed, so scrolling past the tile never cleans it.
 */
export function Soap({ text }: { text: { press: string; ready: string; tile: string; clean: string; again: string; done: string; soap: string } }) {
  const [foam, setFoam] = useState(0)
  const [clean, setClean] = useState(0)
  const [soapBubbles, setSoapBubbles] = useState<Bubble[]>([])
  const [tileBubbles, setTileBubbles] = useState<Bubble[]>([])
  const pressed = useRef(false)
  const seq = useRef(0)

  const lather = () => {
    const b: Bubble[] = Array.from({ length: 10 }, (_, i) => ({ id: ++seq.current, x: 30 + Math.random() * 40, y: 20 + Math.random() * 40, size: 14 + Math.random() * 26, delay: i * 60 }))
    setSoapBubbles(b)
    setFoam((f) => Math.min(1, f + 0.5))
  }
  const rub = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' && !pressed.current) return
    if (foam <= 0 || clean >= 1) return
    if (++seq.current % 3) return
    const r = e.currentTarget.getBoundingClientRect()
    const size = 12 + Math.random() * 22
    setTileBubbles((b) => [...b, { id: seq.current, x: e.clientX - r.left - size / 2, y: e.clientY - r.top - size / 2, size, delay: 0 }].slice(-30))
    setClean((c) => Math.min(1, c + 0.025))
    setFoam((f) => Math.max(0, f - 0.012))
  }
  const pct = Math.round(clean * 100)
  return (
    <div className="soap-game">
      <div className="soap-stage">
        <button type="button" className="soap" onClick={lather} aria-label={text.soap}>
          <span className="side" />
          <span className="top" aria-hidden="true">
            {/* the stamp's word is drawn by CSS (guide.css) so it stays out of the button's name */}
            <span />
          </span>
        </button>
        {soapBubbles.map((b) => (
          <span key={b.id} className="bub" style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.size, height: b.size, animationDelay: `${b.delay}ms` }} />
        ))}
        <b>{foam > 0 ? text.ready : text.press}</b>
      </div>
      <div className="stack">
        <div
          className="tile-stage"
          role="img"
          aria-label={text.tile}
          onPointerDown={() => (pressed.current = true)}
          onPointerUp={() => (pressed.current = false)}
          onPointerLeave={() => (pressed.current = false)}
          onPointerMove={rub}
        >
          <span className="dirt" style={{ '--dirt': (0.82 * (1 - clean)).toFixed(2) } as CSSProperties} />
          {tileBubbles.map((b) => (
            <span key={b.id} className="bub" style={{ left: b.x, top: b.y, width: b.size, height: b.size }} />
          ))}
          {clean >= 1 && <span className="done">{text.done}</span>}
        </div>
        <div className="meter">
          <b>
            {text.clean} {pct}%
          </b>
          <span className="bar">
            <span style={{ '--w': `${pct}%` } as CSSProperties} />
          </span>
          <button
            type="button"
            className="pill"
            onClick={() => {
              setFoam(0)
              setClean(0)
              setSoapBubbles([])
              setTileBubbles([])
            }}
          >
            {text.again}
          </button>
        </div>
      </div>
    </div>
  )
}
