import { afterEach, describe, expect, it, vi } from 'vitest'
import robots from '@/app/robots'

// Owner decision: search and AI crawlers (training included) may read every public page; the CMS, its
// API and the correspondent app stay closed. This reads robots() the way a crawler reads robots.txt:
// its own group if one names it, else "*"; the longest matching rule wins, Allow on a tie.

type Rule = { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] }
const list = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v])

function allowed(agent: string, path: string): boolean {
  const r = robots().rules
  const groups = (Array.isArray(r) ? r : [r]) as Rule[]
  const mine = groups.filter((g) => list(g.userAgent).some((u) => u.toLowerCase() === agent.toLowerCase()))
  const group = mine.length ? mine : groups.filter((g) => list(g.userAgent).includes('*'))
  let best: { len: number; allow: boolean } = { len: -1, allow: true }
  for (const g of group) {
    for (const [paths, allow] of [[list(g.allow), true], [list(g.disallow), false]] as const) {
      for (const p of paths) {
        if (path.startsWith(p) && (p.length > best.len || (p.length === best.len && allow))) best = { len: p.length, allow }
      }
    }
  }
  return best.allow
}

const CRAWLERS = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'GPTBot', 'ChatGPT-User', 'PerplexityBot', 'Google-Extended']
const PUBLIC = ['/', '/en', '/cities/damascus', '/en/cities/damascus', '/inside/bloudan', '/seasons', '/blog/damascus-from-qasioun', '/sitemap.xml', '/sitemaps/cities.xml', '/indexnow-key.txt', '/llms.txt']
const PRIVATE = ['/admin', '/admin/collections/cities', '/api/cities', '/correspondent', '/correspondent/login', '/correspondent/damascus/report']

afterEach(() => vi.unstubAllEnvs())

describe('robots.txt', () => {
  it.each(CRAWLERS)('%s may read every public page', (bot) => {
    for (const p of PUBLIC) expect(allowed(bot, p), `${bot} ${p}`).toBe(true)
  })

  it.each(CRAWLERS)('%s stays out of the admin, the API and the correspondent app', (bot) => {
    for (const p of PRIVATE) expect(allowed(bot, p), `${bot} ${p}`).toBe(false)
  })

  it('points to the sitemap index on the primary host', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.upclosesyria.com')
    expect(robots().sitemap).toBe('https://www.upclosesyria.com/sitemap.xml')
  })

  it('a Vercel Preview keeps every crawler out', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' })
    expect(allowed('Googlebot', '/')).toBe(false)
  })
})
