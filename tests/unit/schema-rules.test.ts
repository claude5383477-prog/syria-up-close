import { describe, expect, it } from 'vitest'
import configPromise from '@/payload.config'
import { forbiddenFieldNames } from '@/lib/schemaRules'

describe('forbiddenFieldNames (content rule ق4)', () => {
  it('flags price and safety fields at any depth, by camelCase/snake_case token', () => {
    const fields = [
      { name: 'title', type: 'text' },
      { name: 'nightlyPrice', type: 'number' },
      { name: 'meta', type: 'group', fields: [{ name: 'entry_fee', type: 'text' }] },
      { name: 'rows', type: 'array', fields: [{ name: 'isSafe', type: 'checkbox' }] },
      { type: 'tabs', tabs: [{ fields: [{ name: 'securityLevel', type: 'text' }] }] },
      { name: 'blocks', type: 'blocks', blocks: [{ slug: 'b', fields: [{ name: 'costs', type: 'number' }] }] },
      { type: 'row', fields: [{ name: 'safetyNote', type: 'text' }] },
    ]
    expect(forbiddenFieldNames(fields).sort()).toEqual(['costs', 'entry_fee', 'isSafe', 'nightlyPrice', 'safetyNote', 'securityLevel'])
  })

  it('does not flag look-alikes', () => {
    expect(forbiddenFieldNames([{ name: 'feedback' }, { name: 'coffee' }, { name: 'safeguardNote' }, { name: 'costume' }])).toEqual([])
  })
})

describe('the real schema', () => {
  it('has no price fields and no safety claims in any collection or global', async () => {
    const config = await configPromise
    const offenders = [
      ...config.collections.flatMap((c) => forbiddenFieldNames(c.fields).map((f) => `${c.slug}.${f}`)),
      ...config.globals.flatMap((g) => forbiddenFieldNames(g.fields).map((f) => `${g.slug}.${f}`)),
    ]
    expect(offenders).toEqual([])
  })

  it('contains every collection and global from SPEC §5.2', async () => {
    const config = await configPromise
    expect(config.collections.map((c) => c.slug)).toEqual(
      expect.arrayContaining([
        'users', 'cities', 'places', 'dayTrips', 'statusItems', 'seasonReports', 'firstVisitPages',
        'stories', 'dailyDetail', 'stays', 'media', 'auditLog',
      ]),
    )
    expect(config.globals.map((g) => g.slug)).toContain('siteSettings')
  })
})
