// Renders sample Open Graph cards to e2e/__screenshots__/og/ for a visual check: npx tsx scripts/og-preview.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { renderOg } from '../src/og/render'

const out = 'e2e/__screenshots__/og'
mkdirSync(out, { recursive: true })
const cards = {
  city: { kicker: 'المدن', title: 'دمشق', subtitle: 'حارات ضيقة وأبواب خشب وأسواق مسقوفة. أقدم مدينة مأهولة تُقرأ بالمشي البطيء.' },
  long: {
    kicker: 'تقرير موسم · بلودان',
    title: 'أول ثلج على بلودان: الطريق سالك من الزبداني والقعدات مفتوحة حتى المسا ٦ ساعات',
    subtitle: 'كتبه: مراسل دمشق',
  },
  en: { kicker: 'Cities', title: 'Aleppo', subtitle: 'A city of kitchens and caravanserais.' },
}
for (const [name, card] of Object.entries(cards)) writeFileSync(`${out}/og-${name}.png`, await renderOg(card))
console.log(`OG previews in ${out}`)
