// /llms.txt (llmstxt.org): what the guide is and where its pages are, in Markdown, so AI assistants
// can find and cite them (GEO, owner decision 2026-10-26). SEO day 5: the pages come from the sitemap
// (lib/sitemap sectionPages), so llms.txt lists exactly the published, indexable pages, in the languages
// that are indexable (lib/seo indexablePaths): never a draft, a noindex page or an untranslated English URL.
import { indexablePaths } from '@/lib/seo'
import type { SitemapPage } from '@/lib/sitemap'

/** What the page is called and its one-line summary (its own lede or description). */
export type LlmsInfo = { name: string; en?: string; note?: string | null }

export type LlmsLink = { name: string; path: string; note?: string; en?: string; englishPath?: string }

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

function line(base: string, l: LlmsLink): string {
  const title = l.en && l.en !== l.name ? `${l.name} / ${l.en}` : l.name
  const english = l.englishPath ? ` ([English](${base}${l.englishPath}))` : ''
  return `- [${title}](${base}${l.path})${english}${l.note ? `: ${clean(l.note)}` : ''}`
}

/**
 * The sitemap pages of one section that we know a name for, with their indexable Arabic and English
 * URLs. A page in the sitemap without a name is skipped rather than listed under its slug.
 */
export function llmsLinks(pages: readonly SitemapPage[], info: (path: string) => LlmsInfo | undefined): LlmsLink[] {
  return pages.flatMap((p) => {
    const i = info(p.path)
    if (!i?.name) return []
    const [ar, en] = indexablePaths(p.path, p.translated ?? true)
    return [{ name: i.name, path: ar ?? p.path, ...(i.en ? { en: i.en } : {}), ...(i.note ? { note: i.note } : {}), ...(en ? { englishPath: en } : {}) }]
  })
}

export function llmsTxt(o: { base: string; cities: LlmsLink[]; trips: LlmsLink[]; firstVisit: LlmsLink[]; seasons?: LlmsLink[] }): string {
  const sec = (title: string, links: LlmsLink[]) => (links.length ? [`## ${title}`, '', ...links.map((l) => line(o.base, l)), ''] : [])
  return [
    '# سوريا عن قرب | Syria Up Close',
    '',
    '> دليل سياحي مستقل عن سوريا كما هي اليوم: مدن وأرياف، أماكن ومطاعم وحلويات وفنادق، بمعلومات مؤرخة من مراسلين على الأرض. بالشراكة مع أهلين (ahleenbooking.com). لسنا جهة رسمية، ولا ننشر أسعاراً ولا ادعاءات عن الأمان.',
    '> An independent travel guide to Syria as it is today, with dated information from correspondents on the ground. Not an official body.',
    '',
    'المحتوى عربي أولاً؛ الصفحات الإنجليزية مذكورة بجانب العربية حين تكون مترجمة. كل صفحة تحمل تاريخ آخر تحديث ومصادرها، وطريقة التحقق مشروحة في صفحة "من نحن".',
    'Arabic first; English versions are linked beside the Arabic when translated. Every page shows its last update and sources; how we check is explained on the About page.',
    '',
    ...sec('المدن · Cities', o.cities),
    ...sec('الأرياف والمصايف · Countryside and resorts (Arabic)', o.trips),
    ...sec('أول زيارة · First visit', o.firstVisit),
    ...sec('تقارير الموسم · Season reports (Arabic)', o.seasons ?? []),
    '## عن الموقع · About',
    '',
    `- [من نحن / About](${o.base}/about): من يكتب الدليل وكيف نتحقق من المعلومات.`,
    `- [كيف نتحقق / How we check](${o.base}/about#how-we-check)`,
    `- [المدونة / Blog](${o.base}/blog)`,
    `- [خريطة الموقع / Sitemap](${o.base}/sitemap.xml)`,
    '',
  ].join('\n')
}
