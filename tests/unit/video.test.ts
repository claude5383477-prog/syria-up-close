import { describe, expect, it } from 'vitest'
import { autoThumbnail, embedUrl, isoDuration, originalUrl, parseVideoUrl, videoAnchor, videoUrlError } from '@/lib/video'
import { videoFromUrl } from '@/hooks/videoFromUrl'
import { videoCards, videoText } from '@/lib/videoCards'

describe('parseVideoUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ', 'wide'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL1', 'youtube', 'dQw4w9WgXcQ', 'wide'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ', 'wide'],
    ['youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ', 'wide'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'youtube', 'dQw4w9WgXcQ', 'wide'],
    ['https://www.youtube.com/shorts/aBcDeFgHiJk', 'youtube', 'aBcDeFgHiJk', 'tall'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ', 'wide'],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ', 'wide'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ', 'wide'],
    ['https://www.instagram.com/p/C1a2B3c4D5e/', 'instagram', 'C1a2B3c4D5e', 'tall'],
    ['https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=xyz', 'instagram', 'C1a2B3c4D5e', 'tall'],
    ['https://instagram.com/reels/C1a2B3c4D5e', 'instagram', 'C1a2B3c4D5e', 'tall'],
    ['https://www.instagram.com/someone/reel/C1a2B3c4D5e/', 'instagram', 'C1a2B3c4D5e', 'tall'],
    ['https://www.instagram.com/tv/C1a2B3c4D5e/', 'instagram', 'C1a2B3c4D5e', 'tall'],
    ['https://www.tiktok.com/@someone/video/7312345678901234567', 'tiktok', '7312345678901234567', 'tall'],
    ['https://www.tiktok.com/@someone/video/7312345678901234567?is_from_webapp=1', 'tiktok', '7312345678901234567', 'tall'],
    ['https://m.tiktok.com/v/7312345678901234567', null, null, null],
    ['https://www.tiktok.com/embed/v2/7312345678901234567', 'tiktok', '7312345678901234567', 'tall'],
    ['https://www.tiktok.com/player/v1/7312345678901234567', 'tiktok', '7312345678901234567', 'tall'],
  ])('%s', (url, platform, id, orientation) => {
    const v = parseVideoUrl(url)
    expect(v).toEqual(platform ? { platform, id, orientation } : null)
  })

  it('refuses everything else', () => {
    for (const bad of ['', '   ', 'not a url', 'ftp://youtube.com/watch?v=dQw4w9WgXcQ', 'https://vimeo.com/123', 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/channel/abc', 'https://youtu.be/', 'https://www.instagram.com/someone/', 'https://www.tiktok.com/@someone', 'javascript:alert(1)'])
      expect(parseVideoUrl(bad), bad).toBeNull()
    expect(parseVideoUrl(42)).toBeNull()
  })
})

describe('editor messages and links', () => {
  it('explains a short TikTok link, and any other refusal', () => {
    expect(videoUrlError('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
    expect(videoUrlError('https://vm.tiktok.com/ZMabc/')).toMatch(/مختصر/)
    expect(videoUrlError('https://vimeo.com/1')).toMatch(/يوتيوب أو إنستغرام أو تيك توك/)
  })

  it('builds the official players, the originals and YouTube stills', () => {
    expect(embedUrl({ platform: 'youtube', id: 'dQw4w9WgXcQ' })).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1')
    expect(embedUrl({ platform: 'instagram', id: 'C1a' })).toBe('https://www.instagram.com/p/C1a/embed/')
    expect(embedUrl({ platform: 'tiktok', id: '73' })).toBe('https://www.tiktok.com/player/v1/73?autoplay=1&rel=0')
    expect(originalUrl({ platform: 'youtube', id: 'x' })).toBe('https://www.youtube.com/watch?v=x')
    expect(originalUrl({ platform: 'instagram', id: 'x' })).toBe('https://www.instagram.com/p/x/')
    expect(originalUrl({ platform: 'tiktok', id: '1' })).toBe('https://www.tiktok.com/video/1')
    expect(autoThumbnail({ platform: 'youtube', id: 'x' })).toBe('https://i.ytimg.com/vi/x/hqdefault.jpg')
    expect(autoThumbnail({ platform: 'tiktok', id: '1' })).toBeNull()
    expect(videoAnchor(7)).toBe('v-7')
  })

  it('turns 18:24 and 1:02:03 into ISO 8601 durations', () => {
    expect(isoDuration('18:24')).toBe('PT18M24S')
    expect(isoDuration('1:02:03')).toBe('PT1H2M3S')
    expect(isoDuration('soon')).toBeUndefined()
    expect(isoDuration(null)).toBeUndefined()
  })
})

describe('videoFromUrl hook', () => {
  const run = (data: Record<string, unknown>) => videoFromUrl({ data } as never)
  it('fills platform, id and shape from the pasted link', () => {
    expect(run({ url: ' https://youtu.be/dQw4w9WgXcQ ', title: 't' })).toEqual({ url: 'https://youtu.be/dQw4w9WgXcQ', title: 't', platform: 'youtube', videoId: 'dQw4w9WgXcQ', orientation: 'wide' })
  })
  it('leaves an unchanged document alone', () => {
    expect(run({ title: 't' })).toEqual({ title: 't' })
  })
})

describe('videoCards', () => {
  it('maps published rows, preferring an uploaded still, skipping broken links', () => {
    const cards = videoCards(
      [
        { id: 1, url: 'https://youtu.be/dQw4w9WgXcQ', platform: 'youtube', videoId: 'dQw4w9WgXcQ', orientation: 'wide', title: { ar: 'جولة', en: 'A walk' }, author: 'A', duration: '1:00' },
        { id: 2, url: 'https://www.tiktok.com/@a/video/7312345678901234567', title: { ar: 'بوظة' }, author: 'B', thumbnail: { id: 9, url: '/m/full.webp', sizes: { card: { url: '/m/card.webp' } } } as never },
        { id: 3, url: 'https://vimeo.com/1', title: 'x', author: 'C' },
        { id: 4, url: 'https://www.instagram.com/p/C1a2B3c4D5e/', title: 'x', author: 'D', thumbnail: { id: 10, url: '/m/x.webp' } as never },
        { id: 5, url: 'https://www.instagram.com/p/C1a2B3c4D5e/', title: null, author: 'E', platform: 'instagram', videoId: 'C1a2B3c4D5e' },
      ],
      'en',
    )
    expect(cards.map((c) => [c.id, c.platform, c.title, c.thumbnail, c.orientation])).toEqual([
      [1, 'youtube', 'A walk', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', 'wide'],
      [2, 'tiktok', 'بوظة', '/m/card.webp', 'tall'],
      [4, 'instagram', 'x', '/m/x.webp', 'tall'],
      [5, 'instagram', '', null, 'tall'],
    ])
  })

  it('labels the platforms in both languages', () => {
    expect(videoText('ar').platforms.tiktok).toBe('تيك توك')
    expect(videoText('en').on).toBe('On {p} ↗')
  })
})
