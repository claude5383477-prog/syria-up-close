import { beforeAll, describe, expect, it } from 'vitest'
import { payload, resetWithAdmin } from './helpers'

beforeAll(resetWithAdmin)

describe('database encoding', () => {
  it('is UTF-8 (Windows code pages cannot store Arabic-Indic digits)', async () => {
    const p = await payload()
    const pool = (p.db as unknown as { pool: { query: (q: string) => Promise<{ rows: { server_encoding: string }[] }> } }).pool
    const { rows } = await pool.query('show server_encoding')
    expect(rows[0]?.server_encoding).toBe('UTF8')
  })

  it('round-trips Arabic letters, Arabic-Indic digits, tashkeel and emoji', async () => {
    const p = await payload()
    const text = 'الكهرباء ٦ ساعات باليوم ۝ مُشَكَّل 🌙'
    const city = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'enc', name: text } })
    const back = await p.findByID({ collection: 'cities', id: city.id, locale: 'ar' })
    expect(back.name).toBe(text)
  })
})
