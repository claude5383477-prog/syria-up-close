import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { markdownToLexical } from '../lib/lexical-text'

// Publishes the five "first visit" pages (owner request 2026-10-26: "leave nothing empty"). They stayed
// drafts because the seed could not reach their official sources on 21 October. Their text was checked
// again on 26 October 2026 (seed-content/first-visit.json: Decision 128 via SANA, the Central Bank
// circulars, the operators and the Ministry of Transport). Only pages that are still drafts are
// touched; anything an editor published is left alone. Publishing stamps the editorial account
// ("فريق التحرير") as the verifier, like the content seed does.

type Page = { topic: string; officialSourceUrl: string | null; otherSources: string[]; body: { ar: string; en: string } }
const EDITOR_EMAIL = 'editorial@syria-up-close.vercel.app'

const body = (md: string, sources: string[], heading: string) =>
  markdownToLexical(
    md.split('\n').slice(1).filter((l) => !/^\*\*(آخر تحقق|Last checked)/.test(l)).join('\n') +
      (sources.length ? `\n### ${heading}\n${sources.map((u) => `- ${u}`).join('\n')}` : ''),
  )

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const { pages } = JSON.parse(readFileSync(path.resolve(process.cwd(), 'seed-content/first-visit.json'), 'utf8')) as { pages: Page[] }
  const editor = (await payload.find({ collection: 'users', where: { email: { equals: EDITOR_EMAIL } }, limit: 1, depth: 0, req })).docs[0]
  for (const p of pages) {
    if (!p.officialSourceUrl) continue
    const doc = (await payload.find({ collection: 'firstVisitPages', where: { topic: { equals: p.topic } }, draft: true, limit: 1, depth: 0, req })).docs[0]
    if (!doc || doc._status === 'published') continue
    const common = { collection: 'firstVisitPages' as const, id: doc.id, draft: false, req, overrideAccess: true, ...(editor ? { user: editor } : {}) }
    await payload.update({ ...common, locale: 'ar', data: { body: body(p.body.ar, p.otherSources, 'مصادر أخرى'), officialSourceUrl: p.officialSourceUrl, _status: 'published' } as never })
    await payload.update({ ...common, locale: 'en', data: { body: body(p.body.en, p.otherSources, 'Other sources'), _status: 'published' } as never })
  }
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  // Back to drafts; the text stays.
  const { docs } = await payload.find({ collection: 'firstVisitPages', limit: 10, depth: 0, req })
  for (const d of docs) await payload.update({ collection: 'firstVisitPages', id: d.id, draft: true, req, overrideAccess: true, data: { _status: 'draft' } as never })
}
