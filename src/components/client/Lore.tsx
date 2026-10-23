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
  const list = items.filter((i) => i.kind === tab)
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="pills" role="group" aria-label="نوع الحكاية">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" className="pill" aria-pressed={k === tab} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p>
          {tab === 'secret' && `لا أسرار منشورة بعد. يرويها أهل ${cityName} بأسمائهم، ونتحقق منها قبل النشر.`}
          {tab === 'joke' && `لا نهفات منشورة بعد. نهفات يحكيها أهل ${cityName} عن أنفسهم، بلا تنميط ولا إساءة لأحد.`}
          {tab === 'proverb' && `لا أمثال منشورة بعد. أمثال تُقال في ${cityName}، مع معناها ومتى تُقال.`}
        </p>
      ) : tab === 'secret' ? (
        <div className="lore-grid">
          {list.map((s, i) => {
            const shown = open.includes(s.id)
            return (
              <button key={s.id} type="button" className="secret g-anim" aria-expanded={shown} onClick={() => setOpen(shown ? open.filter((x) => x !== s.id) : [...open, s.id])}>
                <span className="n">سرّ {i + 1}</span>
                <b>{shown ? s.text : '· · · · · ·'}</b>
                <small>{shown ? `يرويه: ${s.tellerName}` : 'اضغط لتكشف السرّ'}</small>
              </button>
            )
          })}
        </div>
      ) : tab === 'joke' ? (
        <div className="bubbles">
          {list.map((j) => (
            <div className="bubble" key={j.id}>
              <span>{j.text}</span>
              <small>{j.tellerName}</small>
            </div>
          ))}
        </div>
      ) : (
        <div className="lore-grid">
          {list.map((p) => (
            <div className="proverb" key={p.id}>
              <b>{p.text}</b>
              {p.meaning && <span>معناه: {p.meaning}</span>}
              <small>{p.tellerName}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
