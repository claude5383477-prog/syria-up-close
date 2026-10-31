import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { markdownToLexical } from '../lib/lexical-text'

// Owner request 2026-10-31: rewrite the "first visit" pages from Ahleen's visa guide (Decision 128 fee
// table) and travel guide. Unlike 20261027_010000_publish_first_visit, this overwrites pages that are
// already published, since the old text (e.g. the evisa.sy claim) is what the owner asked to replace.

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
    if (!doc) continue
    const common = { collection: 'firstVisitPages' as const, id: doc.id, draft: false, req, overrideAccess: true, ...(editor ? { user: editor } : {}) }
    await payload.update({ ...common, locale: 'ar', data: { body: body(p.body.ar, p.otherSources, 'مصادر أخرى'), officialSourceUrl: p.officialSourceUrl, _status: 'published' } as never })
    await payload.update({ ...common, locale: 'en', data: { body: body(p.body.en, p.otherSources, 'Other sources'), _status: 'published' } as never })
  }
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // Content-only change; the previous text stays in the pages' version history.
}
