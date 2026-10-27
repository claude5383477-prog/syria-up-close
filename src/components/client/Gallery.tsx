'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

/**
 * Everything here is sent to the browser for every photo, so nothing is repeated: `alt` is also the
 * caption, and `full` is left out when the large file is the same as `src`.
 */
export type GalleryPhoto = { id: number; src: string; full?: string; alt: string; meta: string }

// Free-licensed photos load straight from Wikimedia/Flickr, already sized; the rest go through the optimizer.
const EXTERNAL = /^https:\/\/((upload|thumb)\.wikimedia\.org|live\.staticflickr\.com|farm\d+\.staticflickr\.com)\//

// Repeating mosaic: a big square, then two tall and wide tiles, so a short gallery still has rhythm.
const SHAPE = ['wide tall', '', '', 'tall', 'wide', '', '', 'wide']

/** A city's photo mosaic; a photo opens full size in a dialog (Esc or the button closes it). */
export function Gallery({ photos, close, more, first = 24 }: { photos: GalleryPhoto[]; close: string; more?: string; first?: number }) {
  const [shot, setShot] = useState<number | null>(null)
  const [all, setAll] = useState(false)
  const shown = all || !more ? photos : photos.slice(0, first)
  const current = shot === null ? null : photos[shot]
  const currentFull = current ? (current.full ?? current.src) : ''
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (shot === null) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShot(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shot])
  return (
    <>
      <div className="gallery">
        {shown.map((p, i) => (
          <button key={p.id} type="button" className={SHAPE[i % SHAPE.length]} onClick={() => setShot(i)} aria-label={p.alt}>
            <Image src={p.src} alt="" fill sizes="(max-width: 560px) 50vw, 25vw" unoptimized={EXTERNAL.test(p.src)} />
          </button>
        ))}
      </div>
      {more && !all && photos.length > first && (
        <button type="button" className="btn-pill gallery-more" onClick={() => setAll(true)}>
          {more.replace('{n}', String(photos.length))}
        </button>
      )}
      {current && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={current.alt} onClick={(e) => e.target === e.currentTarget && setShot(null)}>
          <figure>
            <Image src={currentFull} alt={current.alt} width={1600} height={1200} style={{ width: '100%', height: 'auto' }} unoptimized={EXTERNAL.test(currentFull)} />
            <figcaption className="row-x">
              <span>
                {current.alt}
                {current.meta && ` · ${current.meta}`}
              </span>
              <button ref={closeRef} type="button" onClick={() => setShot(null)}>
                {close}
              </button>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  )
}
