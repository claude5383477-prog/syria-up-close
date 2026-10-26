// /llms.txt (llmstxt.org): what the guide is and where its pages are, in Markdown, so AI assistants
// can find and cite them (GEO, owner decision 2026-10-26).

export type LlmsLink = { name: string; path: string; note?: string; en?: string }

const line = (base: string, l: LlmsLink) => `- [${l.name}${l.en && l.en !== l.name ? ` / ${l.en}` : ''}](${base}${l.path})${l.note ? `: ${l.note.replace(/\s+/g, ' ').trim()}` : ''}`

export function llmsTxt(o: { base: string; cities: LlmsLink[]; trips: LlmsLink[]; firstVisit: LlmsLink[] }): string {
  const sec = (title: string, links: LlmsLink[]) => (links.length ? [`## ${title}`, '', ...links.map((l) => line(o.base, l)), ''] : [])
  return [
    '# سوريا عن قرب | Syria Up Close',
    '',
    '> دليل سياحي مستقل عن سوريا كما هي اليوم: مدن وأرياف، أماكن ومطاعم وحلويات وفنادق، بمعلومات مؤرخة من مراسلين على الأرض. بالشراكة مع أهلين (ahleenbooking.com). لسنا جهة رسمية، ولا ننشر أسعاراً ولا ادعاءات عن الأمان.',
    '> An independent travel guide to Syria as it is today, with dated information from correspondents on the ground. Not an official body.',
    '',
    ...sec('المدن · Cities', o.cities),
    ...sec('الأرياف والمصايف · Countryside and resorts (Arabic)', o.trips),
    ...sec('أول زيارة · First visit (English)', o.firstVisit),
    '## عن الموقع · About',
    '',
    `- [من نحن / About](${o.base}/about): من يكتب الدليل وكيف نتحقق من المعلومات.`,
    `- [المدونة / Blog](${o.base}/blog)`,
    `- [خريطة الموقع / Sitemap](${o.base}/sitemap.xml)`,
    '',
  ].join('\n')
}
