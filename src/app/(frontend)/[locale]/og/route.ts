import { isLocale, LOCALES } from '@/lib/i18n'
import { renderOg } from '@/og/render'

// Default social card at a stable URL (/og, /en/og), referenced by lib/seo for every page.
// Cities and season reports have their own opengraph-image files, which take priority.
export const dynamic = 'force-static'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) return new Response('Not found', { status: 404 })
  const card =
    locale === 'en'
      ? { kicker: 'An independent guide', title: 'Syria as it is today, up close.', subtitle: 'Dated information, people on the ground, photos from the place itself.' }
      : { kicker: 'دليل مستقل', title: 'سوريا كما هي اليوم، عن قرب.', subtitle: 'معلومات مؤرخة، وناس على الأرض، وصور من المكان نفسه.' }
  return new Response(new Uint8Array(await renderOg(card)), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
  })
}
