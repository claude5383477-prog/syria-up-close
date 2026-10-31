'use client'

import { useState } from 'react'

export type LoreItem = { id: number; kind: 'secret' | 'joke' | 'proverb'; text: string; meaning?: string | null; tellerName: string }

const TABS = [
  ['secret', 'أسرار'],
  ['joke', 'نهفات ونكات'],
  ['proverb', 'أمثال'],
] as const

/**
 * A city's secrets (closed cards that open on press), jokes (speech bubbles) and proverbs, told and
 * signed by people of the city. Arabic only. With nothing published yet, each tab says who fills it.
 */
export function Lore({ items, cityName }: { items: LoreItem[]; cityName: string }) {
  const [tab, setTab] = useState<LoreItem['kind']>('secret')
  const [open, setOpen] = useState<number[]>([])
  const of = (kind: LoreItem['kind']) => items.filter((i) => i.kind === kind)
  const secrets = of('secret')
  const jokes = of('joke')
  const proverbs = of('proverb')
  // Every tab is in the HTML (SEO day 5: crawlers that run no JavaScript read all of it); the pills only
  // choose which one shows. Hidden panels are skipped by screen readers, like any tab panel.
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="pills" role="group" aria-label="نوع الحكاية">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" className="pill" aria-pressed={k === tab} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      <div hidden={tab !== 'secret'}>
        {secrets.length === 0 ? (
          <div className="lore-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="secret locked">
                <span className="n">سرّ {n}</span>
                <b>· · · · · ·</b>
                <small>{n === 1 ? `لا أسرار منشورة بعد. يرويها أهل ${cityName} بأسمائهم، ونتحقق منها قبل النشر.` : 'بانتظار راويه'}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="lore-grid">
            {secrets.map((s, i) => {
              const shown = open.includes(s.id)
              return (
                <button key={s.id} type="button" className="secret g-anim" aria-expanded={shown} onClick={() => setOpen(shown ? open.filter((x) => x !== s.id) : [...open, s.id])}>
                  <span className="n">سرّ {i + 1}</span>
                  {/* A closed card shows dots; its text stays in the page for crawlers and screen readers. */}
                  {shown ? <b>{s.text}</b> : (
                    <>
                      <b aria-hidden="true">· · · · · ·</b>
                      <span className="sr-only">{s.text}</span>
                    </>
                  )}
                  <small>{shown ? `يرويه: ${s.tellerName}` : 'اضغط لتكشف السرّ'}</small>
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div hidden={tab !== 'joke'}>
        {jokes.length === 0 ? (
          <p>{`لا نهفات منشورة بعد. نهفات يحكيها أهل ${cityName} عن أنفسهم، بلا تنميط ولا إساءة لأحد.`}</p>
        ) : (
          <div className="bubbles">
            {jokes.map((j) => (
              <div className="bubble" key={j.id}>
                <span>{j.text}</span>
                <small>{j.tellerName}</small>
              </div>
            ))}
          </div>
        )}
      </div>
      <div hidden={tab !== 'proverb'}>
        {proverbs.length === 0 ? (
          <p>{`لا أمثال منشورة بعد. أمثال تُقال في ${cityName}، مع معناها ومتى تُقال.`}</p>
        ) : (
          <div className="lore-grid">
            {proverbs.map((p) => (
              <div className="proverb" key={p.id}>
                <b>{p.text}</b>
                {p.meaning && <span>معناه: {p.meaning}</span>}
                <small>{p.tellerName}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
