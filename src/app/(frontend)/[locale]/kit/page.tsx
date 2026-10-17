import { Page } from '@/components/Header'
import { notFound } from 'next/navigation'
import { Brand, Mark } from '@/components/Logo'
import { Stamp } from '@/components/Stamp'
import { ButtonLink, Card, Chip, PhotoPlaceholder, SoonTag, StayCard } from '@/components/ui'
import { isLocale, type Locale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'

// Design-review page for checkpoint A. Only served when SHOW_KIT=1 at runtime; 404 everywhere else.
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Kit', robots: { index: false, follow: false } }

const DAY = 86_400_000

const T = {
  ar: {
    title: 'عدّة التصميم',
    lede: 'الشعار والمكوّنات وشارة "آخر تحديث" بحالاتها الثلاث. صفحة مراجعة داخلية.',
    type: 'سلّم الخطوط',
    display: 'سوريا كما هي اليوم، عن قرب.',
    body: 'معلومات مؤرخة، وناس على الأرض، وصور من المكان نفسه. كل معلومة عملية تحمل تاريخ آخر تحقق واسم من تحقق منها.',
    caption: 'تعليق · ١٣ بكسل',
    logo: 'الشعار A',
    buttons: 'الأزرار والروابط',
    primary: 'دليل أول زيارة',
    ghost: 'تصفّح المدن',
    link: 'كل التقارير',
    chips: 'الوسوم',
    city: 'دمشق',
    cat: 'المدينة القديمة',
    aud: 'زيارة أولى',
    stamps: 'شارة "آخر تحديث"',
    fresh: 'محدّثة (قبل يومين)',
    stale: 'قد تكون قديمة (قبل ١٠ أيام، المهلة ٧)',
    pending: 'بانتظار أول تحقق',
    cards: 'البطاقات',
    placeCard: 'الجامع الأموي',
    placeBody: 'صحن الجامع وقت العصر، حين يهدأ الزحام.',
    shot: 'ضوء على بلاط باب توما بعد المطر',
    articleCard: 'خطط رحلات جاهزة',
    articleBody: 'خطط من 3 إلى 10 أيام، لكل ليلة إقامة مقترحة.',
    stay: 'بطاقة الإقامة',
    disclosure: 'أهلين شريك هذا الدليل.',
    note: 'القواعد تتغير بسرعة. إن وجدت معلومة قديمة في أي صفحة، راسلنا لنتحقق منها ونحدّث تاريخها.',
  },
  en: {
    title: 'Design kit',
    lede: 'Logo, components and the three states of the “last updated” stamp. Internal review page.',
    type: 'Type scale',
    display: 'Syria as it is today, up close.',
    body: 'Dated information, people on the ground, photos from the place itself. Every practical fact carries the date of its last check and who checked it.',
    caption: 'Caption · 12px',
    logo: 'Logo A',
    buttons: 'Buttons and links',
    primary: 'First-visit guide',
    ghost: 'Browse cities',
    link: 'All reports',
    chips: 'Chips',
    city: 'Damascus',
    cat: 'Old city',
    aud: 'First visit',
    stamps: '“Last updated” stamp',
    fresh: 'Fresh (2 days ago)',
    stale: 'May be out of date (10 days ago, limit 7)',
    pending: 'Awaiting first check',
    cards: 'Cards',
    placeCard: 'Umayyad Mosque',
    placeBody: 'The courtyard in late afternoon, when it quietens.',
    shot: 'Light on Bab Touma paving after rain',
    articleCard: 'Ready-made trip plans',
    articleBody: '3 to 10-day plans, with a suggested stay for each night.',
    stay: 'Stay card',
    disclosure: 'Ahleen is this guide’s partner.',
    note: 'Rules change fast. If you spot something outdated on any page, tell us and we’ll re-check and re-date it.',
  },
} as const

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="kit-row">
      <span className="cap">{label}</span>
      <div>{children}</div>
    </div>
  )
}

export default async function KitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (process.env.SHOW_KIT !== '1' || !isLocale(locale)) notFound()
  const t = T[locale as Locale]
  const now = new Date()

  return (
    <Page locale={locale as Locale} path="/kit">
      <section className="kit-band">
        <div className="wrap kit-hero">
          <div style={{ display: 'grid', gap: 12 }}>
            <span className="kicker">{t.logo}</span>
            <p className="display">{t.title}</p>
            <p className="kit-muted">{t.lede}</p>
          </div>
          <div className="kit-mark">
            <Mark size={220} />
          </div>
        </div>
      </section>

      <section className="s">
        <div className="wrap kit-grid">
          <Row label={t.logo}>
            <div className="kit-inline">
              <Brand href={localePath(locale as Locale, '/')} />
              <span style={{ color: 'var(--brand)' }}>
                <Mark size={64} />
              </span>
            </div>
          </Row>

          <Row label={t.stamps}>
            <div className="kit-stack">
              <div className="kit-inline">
                <Stamp verifiedAt={new Date(now.getTime() - 2 * DAY)} maxAgeDays={7} locale={locale as Locale} now={now} />
                <span className="cap">{t.fresh}</span>
              </div>
              <div className="kit-inline">
                <Stamp verifiedAt={new Date(now.getTime() - 10 * DAY)} maxAgeDays={7} locale={locale as Locale} now={now} />
                <span className="cap">{t.stale}</span>
              </div>
              <div className="kit-inline">
                <Stamp verifiedAt={null} maxAgeDays={7} locale={locale as Locale} now={now} />
                <span className="cap">{t.pending}</span>
              </div>
            </div>
          </Row>

          <Row label={t.type}>
            <div className="kit-stack">
              <p className="display" style={{ color: 'var(--brand)' }}>{t.display}</p>
              <h1>{t.display}</h1>
              <h2>{t.display}</h2>
              <h3>{t.display}</h3>
              <p>{t.body}</p>
              <span className="cap">{t.caption}</span>
            </div>
          </Row>

          <Row label={t.buttons}>
            <div className="kit-inline">
              <ButtonLink href="#">{t.primary}</ButtonLink>
              <ButtonLink href="#" ghost>{t.ghost}</ButtonLink>
              <a className="link" href="#">{t.link}</a>
              <SoonTag locale={locale as Locale} />
            </div>
          </Row>

          <Row label={t.chips}>
            <div className="chips">
              <Chip kind="city">{t.city}</Chip>
              <Chip kind="cat">{t.cat}</Chip>
              <Chip kind="aud">{t.aud}</Chip>
            </div>
          </Row>

          <Row label={t.cards}>
            <div className="grid g3">
              <Card title={t.placeCard} href="#" media={<PhotoPlaceholder shot={t.shot} tall />}>
                <div className="chips"><Chip kind="city">{t.city}</Chip></div>
                <p>{t.placeBody}</p>
              </Card>
              <Card title={t.placeCard} media={<PhotoPlaceholder shot={t.placeBody} />}>
                <p>{t.placeBody}</p>
              </Card>
              <Card title={<>{t.articleCard}<SoonTag locale={locale as Locale} /></>}>
                <Chip kind="aud">{t.aud}</Chip>
                <p>{t.articleBody}</p>
              </Card>
            </div>
          </Row>

          <Row label={t.stay}>
            <StayCard
              locale={locale as Locale}
              cityName={t.city}
              href="https://ahleenbooking.com"
              rel="sponsored noopener"
              disclosure={t.disclosure}
              aboutHref={localePath(locale as Locale, '/about')}
            />
          </Row>

          <Row label="note">
            <p className="note" style={{ maxWidth: 'none' }}>{t.note}</p>
          </Row>
        </div>
      </section>
    </Page>
  )
}
