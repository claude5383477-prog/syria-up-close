'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { searchItems, type SearchItem } from '@/lib/rural'

/** "Find a city, place or dish" on the home page (review 2026-10-26: no search on the site). */
export function SiteSearch({ items, label, placeholder, none, results }: { items: SearchItem[]; label: string; placeholder: string; none: string; results: string }) {
  const [q, setQ] = useState('')
  const found = useMemo(() => searchItems(items, q), [items, q])
  return (
    <div className="site-search" id="search" role="search">
      <label htmlFor="site-q">{label}</label>
      <div className="field">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input id="site-q" type="search" autoComplete="off" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} aria-describedby="site-q-status" />
      </div>
      <p id="site-q-status" className="sr-only" aria-live="polite">
        {q.trim().length >= 2 ? (found.length ? results.replace('{n}', String(found.length)) : none) : ''}
      </p>
      {found.length > 0 && (
        <ul aria-label={results.replace('{n}', String(found.length))}>
          {found.map((it) => (
            <li key={`${it.type}-${it.name}-${it.href}`}>
              <Link href={it.href}>
                <span className="t">{it.type}</span>
                <span className="n">
                  <b>{it.name}</b>
                  <small>{it.sub}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && !found.length && <p className="none">{none}</p>}
    </div>
  )
}
