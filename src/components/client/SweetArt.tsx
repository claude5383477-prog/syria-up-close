'use client'

import { useState } from 'react'

/**
 * A city's drawn sweet, like the home page's shawarma: press it and something comes out.
 * The page passes only its own city's drawing, so the browser never downloads the other cities' art.
 */
export function SweetArt({ art, make, again, hint, hintDone, said }: { art: { base: string; on: string }; make: string; again: string; hint: string; hintDone: string; said: string }) {
  const [on, setOn] = useState(false)
  return (
    <div className="swt-wrap">
      <button type="button" className={on ? 'swt on' : 'swt'} onClick={() => setOn(!on)} aria-label={on ? again : make} aria-pressed={on}>
        <svg viewBox="0 0 420 420" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: art.base }} />
        {on && <svg className="over" viewBox="0 0 420 420" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: art.on }} />}
        {on && <span className="said">{said}</span>}
      </button>
      <span className="shw-hint" aria-live="polite">
        {on ? hintDone : hint}
      </span>
    </div>
  )
}
