import { isLocale, type Locale } from '@/lib/i18n'
import { OG_CACHE_STATIC, renderOg } from '@/og/render'

// Default social card at a stable URL (/og, /en/og), referenced by lib/seo for every page.
// Cities and season reports have their own opengraph-image files, which take priority.
// Rendered on first request, not at build: Pango in the parallel build workers crashed the Windows
// build with heap corruption (0xC0000374). The card never changes, so one render per process is kept.
export const dynamic = 'force-dynamic'

const cards = new Map<Locale, Promise<Buffer>>()

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) return new Response('Not found', { status: 404 })
  let png = cards.get(locale)
  if (!png) {
    png = renderOg(
      locale === 'en'
        ? { kicker: 'An independent guide', title: 'Syria as it is today, up close.', subtitle: 'Dated information, people on the ground, photos from the place itself.' }
        : { kicker: 'دليل مستقل', title: 'سوريا كما هي اليوم، عن قرب.', subtitle: 'معلومات مؤرخة، وناس على الأرض، وصور من المكان نفسه.' },
    )
    png.catch(() => cards.delete(locale))
    cards.set(locale, png)
  }
  return new Response(new Uint8Array(await png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': OG_CACHE_STATIC },
  })
}
