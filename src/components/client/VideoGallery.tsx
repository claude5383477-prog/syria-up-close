'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { embedUrl, originalUrl, videoAnchor, type Orientation, type Platform } from '@/lib/video'

export type VideoCardData = {
  id: number
  platform: Platform
  videoId: string
  orientation: Orientation
  title: string
  author: string
  duration?: string | null
  thumbnail?: string | null
}

type Text = {
  all: string
  platforms: Record<Platform, string>
  tabs: string
  play: string
  share: string
  on: string
  close: string
  copied: string
  link: string
}

const PLAY = (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14l11-7z" fill="#0B4836" />
  </svg>
)
const SHARE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" />
  </svg>
)
const OUT = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
  </svg>
)

/**
 * "عدسات" cards with platform tabs and an in-page player (batch 4). No player loads before the visitor
 * presses play (speed and privacy): the iframe is created on open and removed on close. /videos#v-<id>
 * opens that video directly. Sharing uses the Web Share sheet on phones, else copies the link.
 */
export function VideoGallery({ videos, text, tabs = true, pagePath }: { videos: VideoCardData[]; text: Text; tabs?: boolean; pagePath: string }) {
  const [pf, setPf] = useState<Platform | 'all'>('all')
  const [open, setOpen] = useState<VideoCardData | null>(null)
  const [toast, setToast] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const shown = videos.filter((v) => pf === 'all' || v.platform === pf)
  const count = (k: Platform | 'all') => videos.filter((v) => k === 'all' || v.platform === k).length

  const show = useCallback((v: VideoCardData) => {
    setOpen(v)
    requestAnimationFrame(() => dialog.current?.showModal?.())
  }, [])

  useEffect(() => {
    const fromHash = () => {
      const m = /^#v-(\d+)$/.exec(window.location.hash)
      const v = m && videos.find((x) => String(x.id) === m[1])
      if (v) show(v)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [videos, show])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const share = async (v: VideoCardData) => {
    const url = `${window.location.origin}${pagePath}#${videoAnchor(v.id)}`
    const touch = window.matchMedia('(pointer: coarse)').matches
    try {
      if (touch && navigator.share) return await navigator.share({ title: v.title, url })
      await navigator.clipboard.writeText(url)
      setToast(text.copied)
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setToast(`${text.link} ${url}`)
    }
  }

  const close = () => {
    dialog.current?.close()
  }

  return (
    <>
      {tabs && (
        <div className="platforms" role="group" aria-label={text.tabs}>
          {(['all', 'youtube', 'instagram', 'tiktok'] as const).map((k) => (
            <button key={k} type="button" className="pill" aria-pressed={pf === k} onClick={() => setPf(k)}>
              {k === 'all' ? text.all : text.platforms[k]} <span className="n">{count(k)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="vgrid">
        {shown.map((v) => (
          <article key={v.id} className="vcard" id={videoAnchor(v.id)}>
            {/* The play button holds only the icon, so its name ("play: <title>") matches what it shows (axe). */}
            <div className={`vthumb ${v.orientation}`}>
              {v.thumbnail ? (
                // Already an 800px WebP (Media "card") or YouTube's own still: no need for Vercel's image optimizer.
                <Image src={v.thumbnail} alt="" fill sizes="(max-width: 600px) 50vw, 25vw" unoptimized />
              ) : (
                <svg aria-hidden="true" focusable="false">
                  <rect width="100%" height="100%" fill="url(#syr-vine)" opacity=".45" />
                </svg>
              )}
              <span className={`tag pf pf-${v.platform}`}>{text.platforms[v.platform]}</span>
              {v.duration && <span className="dur">{v.duration}</span>}
              <button type="button" className="vplay" aria-label={`${text.play}: ${v.title}`} onClick={() => show(v)}>
                <span className="play">{PLAY}</span>
              </button>
            </div>
            <div className="b">
              <h3>{v.title}</h3>
              <span className="by">
                {v.author} · {text.platforms[v.platform]}
              </span>
              <div className="row">
                <button type="button" className="pill" onClick={() => share(v)}>
                  {SHARE} {text.share}
                </button>
                <a className="pill" href={originalUrl({ platform: v.platform, id: v.videoId })} target="_blank" rel="noopener noreferrer">
                  {OUT} {text.on.replace('{p}', text.platforms[v.platform])}
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="player"
        aria-label={open?.title}
        onClose={() => {
          setOpen(null)
          if (/^#v-\d+$/.test(window.location.hash)) history.replaceState(null, '', window.location.pathname + window.location.search)
        }}
        onClick={(e) => e.target === dialog.current && close()}
      >
        {open && (
          <>
            <div className={`screen ${open.orientation}`}>
              <iframe
                src={embedUrl({ platform: open.platform, id: open.videoId })}
                title={open.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <div className="pb">
              <span className={`tag pf pf-${open.platform}`} style={{ alignSelf: 'flex-start' }}>
                {text.platforms[open.platform]}
                {open.duration ? ` · ${open.duration}` : ''}
              </span>
              <h2>{open.title}</h2>
              <span className="muted">{open.author}</span>
              <div className="row">
                <button type="button" className="btn-pill small" onClick={() => share(open)}>
                  {SHARE} {text.share}
                </button>
                <a className="btn-pill small ghost" href={originalUrl({ platform: open.platform, id: open.videoId })} target="_blank" rel="noopener noreferrer">
                  {OUT} {text.on.replace('{p}', text.platforms[open.platform])}
                </a>
                <button type="button" className="btn-pill small ghost close" onClick={close}>
                  {text.close}
                </button>
              </div>
            </div>
          </>
        )}
      </dialog>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  )
}
