import { describe, expect, it } from 'vitest'
import { touristDestinationLd } from '@/lib/jsonld'

describe('touristDestinationLd attractions', () => {
  const base = { base: 'https://x.org', locale: 'ar' as const, path: '/cities/homs', name: 'حمص' }

  it('lists places as TouristAttraction with absolute images', () => {
    const ld = touristDestinationLd({ ...base, attractions: [{ name: 'قلعة الحصن', description: 'قلعة', image: '/media/a.webp' }, { name: 'سوق' }] })
    expect(ld.includesAttraction).toEqual([
      { '@type': 'TouristAttraction', name: 'قلعة الحصن', description: 'قلعة', image: 'https://x.org/media/a.webp' },
      { '@type': 'TouristAttraction', name: 'سوق' },
    ])
  })

  it('omits the list when there are no places', () => {
    expect(touristDestinationLd({ ...base, attractions: [] })).not.toHaveProperty('includesAttraction')
  })
})
