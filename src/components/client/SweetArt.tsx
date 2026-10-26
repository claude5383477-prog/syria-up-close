'use client'

import { useState } from 'react'
import { SWEET_ART } from '@/content/sweetArt'

/** A city's drawn sweet, like the home page's shawarma: press it and something comes out. */
export function SweetArt({ slug, make, again, hint, hintDone, said }: { slug: string; make: string; again: string; hint: string; hintDone: string; said: string }) {
  const [on, setOn] = useState(false)
  const art = SWEET_ART[slug]
  if (!art) return null
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
