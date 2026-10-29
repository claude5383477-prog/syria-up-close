import { beforeAll, describe, expect, it } from 'vitest'
import { CITY_VIDEOS, down, up } from '@/migrations/20261029_120000_city_videos'
import { getCityVideos } from '@/data/queries'
import { payload, resetWithAdmin } from './helpers'

type Args = Parameters<typeof up>[0]

describe('migration 20261029_120000_city_videos (content)', () => {
  let damascus: number
  beforeAll(async () => {
    await resetWithAdmin()
    const p = await payload()
    damascus = (await p.create({ collection: 'cities', data: { slug: 'damascus', name: 'دمشق' }, locale: 'ar', overrideAccess: true })).id
    await p.create({ collection: 'cities', data: { slug: 'aleppo', name: 'حلب' }, locale: 'ar', overrideAccess: true })
  })

  it('adds each existing city its own published videos, once, in both languages', async () => {
    const p = await payload()
    const args = { payload: p, req: { payload: p } } as unknown as Args
    await up(args)
    await up(args)
    const expected = CITY_VIDEOS.filter((v) => v.city === 'damascus' || v.city === 'aleppo').length
    expect((await p.count({ collection: 'videos', overrideAccess: true })).totalDocs).toBe(expected)
    const mine = await getCityVideos(damascus)
    expect(mine.map((v) => v.videoId)).toEqual(CITY_VIDEOS.filter((v) => v.city === 'damascus').map((v) => v.id))
    expect(mine[0]).toMatchObject({ platform: 'youtube', orientation: 'wide', author: 'Arab Diaries', title: { ar: 'جولة مشي في القيمرية', en: 'Damascus, Qimaria Street walking tour' } })
  })

  it('removes only its own videos on the way down', async () => {
    const p = await payload()
    await p.create({ collection: 'videos', locale: 'ar', overrideAccess: true, data: { url: 'https://youtu.be/aaaaaaaaaaa', title: 'من المحرر', author: 'x', _status: 'published' } })
    await down({ payload: p, req: { payload: p } } as unknown as Args)
    const left = (await p.find({ collection: 'videos', overrideAccess: true, locale: 'ar' })).docs
    expect(left.map((v) => v.title)).toEqual(['من المحرر'])
  })
})
