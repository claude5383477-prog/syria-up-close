'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

export type GalleryPhoto = { id: number; src: string; full: string; alt: string; caption: string; meta: string }

// Repeating mosaic: a big square, then two tall and wide tiles, so a short gallery still has rhythm.
const SHAPE = ['wide tall', '', '', 'tall', 'wide', '', '', 'wide']

/** A city's photo mosaic; a photo opens full size in a dialog (Esc or the button closes it). */
export function Gallery({ photos, close }: { photos: GalleryPhoto[]; close: string }) {
  const [shot, setShot] = useState<number | null>(null)
  const current = shot === null ? null : photos[shot]
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
        {photos.map((p, i) => (
          <button key={p.id} type="button" className={SHAPE[i % SHAPE.length]} onClick={() => setShot(i)} aria-label={p.alt}>
            <Image src={p.src} alt="" fill sizes="(max-width: 560px) 50vw, 25vw" unoptimized={p.src.startsWith('https://upload.wikimedia.org/')} />
          </button>
        ))}
      </div>
      {current && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={current.alt} onClick={(e) => e.target === e.currentTarget && setShot(null)}>
          <figure>
            <Image src={current.full} alt={current.alt} width={1600} height={1200} style={{ width: '100%', height: 'auto' }} unoptimized={current.full.startsWith('https://upload.wikimedia.org/')} />
            <figcaption className="row-x">
              <span>
                {current.caption}
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
