'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MESSAGES } from '../logic'

// Offline drafts (SPEC §5.4): text fields autosave to localStorage, a chosen photo is kept in
// IndexedDB when the form is submitted offline. Nothing is ever sent automatically: when the
// connection returns, the correspondent sees the draft and presses "send".

const LS = (key: string) => `suc-draft:${key}`
const DB = 'suc-drafts'

function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open(DB, 1)
      open.onupgradeneeded = () => open.result.createObjectStore('photos')
      open.onerror = () => resolve(undefined)
      open.onsuccess = () => {
        const req = fn(open.result.transaction('photos', mode).objectStore('photos'))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(undefined)
      }
    } catch {
      resolve(undefined)
    }
  })
}

type Fields = Record<string, string>

function readFields(form: HTMLFormElement): Fields {
  const out: Fields = {}
  for (const el of Array.from(form.elements)) {
    const f = el as HTMLInputElement
    if (!f.name || f.type === 'hidden' || f.type === 'file' || f.type === 'password' || f.type === 'submit') continue
    out[f.name] = f.value
  }
  return out
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(LS(key))
  } catch {}
  void idb('readwrite', (s) => s.delete(key))
}

/** Place inside a <form>. `sent` = the server confirmed this form's last submission. */
export function DraftKeeper({ draftKey, sent }: { draftKey: string; sent: boolean }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [state, setState] = useState<'none' | 'restored' | 'offline'>('none')

  const save = useCallback((form: HTMLFormElement) => {
    try {
      localStorage.setItem(LS(draftKey), JSON.stringify(readFields(form)))
    } catch {}
  }, [draftKey])

  useEffect(() => {
    const form = anchor.current?.closest('form')
    if (!form) return
    if (sent) {
      clearDraft(draftKey)
      return
    }

    let stored: Fields | null = null
    try {
      stored = JSON.parse(localStorage.getItem(LS(draftKey)) ?? 'null') as Fields | null
    } catch {}
    const hasPhoto = idb<Blob>('readonly', (s) => s.get(draftKey) as IDBRequest<Blob>)
    void hasPhoto.then((blob) => {
      if (blob instanceof File) {
        const input = form.querySelector<HTMLInputElement>('input[type=file]')
        if (input) {
          const dt = new DataTransfer()
          dt.items.add(blob)
          input.files = dt.files
        }
      }
      if (stored || blob) setState('restored')
    })
    if (stored) {
      for (const [name, value] of Object.entries(stored)) {
        const f = form.elements.namedItem(name) as HTMLInputElement | null
        if (f && 'value' in f) f.value = value
      }
    }

    const onInput = () => save(form)
    const onSubmit = (e: SubmitEvent) => {
      if (navigator.onLine) return // the server answers; ?saved clears the draft
      e.preventDefault()
      save(form)
      const file = form.querySelector<HTMLInputElement>('input[type=file]')?.files?.[0]
      if (file) void idb('readwrite', (s) => s.put(file, draftKey))
      setState('offline')
    }
    const onOnline = () => setState((s) => (s === 'offline' ? 'restored' : s))
    form.addEventListener('input', onInput)
    form.addEventListener('submit', onSubmit)
    window.addEventListener('online', onOnline)
    return () => {
      form.removeEventListener('input', onInput)
      form.removeEventListener('submit', onSubmit)
      window.removeEventListener('online', onOnline)
    }
  }, [draftKey, sent, save])

  // Once the server confirms this form was sent, no draft banner applies.
  const shown = sent ? 'none' : state

  return (
    <span ref={anchor} style={{ display: 'contents' }}>
      {shown === 'offline' && (
        <span className="c-msg err" role="alert">
          {MESSAGES.offline}
        </span>
      )}
      {shown === 'restored' && (
        <span className="c-msg info" role="status">
          عندك مسودة غير مرسلة.{' '}
          <button type="submit" className="link" style={{ background: 'none', border: 0, font: 'inherit', cursor: 'pointer' }}>
            أرسلها الآن
          </button>
        </span>
      )}
    </span>
  )
}

/** Clears a draft whose form lives on another page (e.g. the report, after it was sent). */
export function ClearDraft({ draftKey, when }: { draftKey: string; when: boolean }) {
  useEffect(() => {
    if (when) clearDraft(draftKey)
  }, [draftKey, when])
  return null
}
