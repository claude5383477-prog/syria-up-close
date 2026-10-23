import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import { SectionHead } from '@/components/content'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/lib/i18n'
import { FlipCards, Lens, Soap, Steps } from '@/components/client/About'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    locale,
    path: '/about',
    title: locale === 'en' ? 'About' : 'من نحن',
    description: locale === 'en' ? 'An independent, Arabic-first travel guide to Syria. Not an official body; we do not sell tours.' : 'دليل سياحي مستقل عن سوريا، عربي أولاً. لسنا جهة رسمية ولا نبيع جولات.',
  })
}

export default async function AboutPage({ params }: Props) {
  const { locale: l } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)

  return (
    <Page locale={locale} path="/about">
      <section className="band s">
        <div className="wrap stack" style={{ gap: 18 }}>
          <span className="kicker">{T('من نحن', 'About')}</span>
          <h1 className="display">{T('عدسة تقترب من التفاصيل الحقيقية.', 'A lens that moves closer to real details.')}</h1>
          <p style={{ fontSize: 19 }}>
            {T(
              'سوريا عن قرب دليل سياحي مستقل، عربي أولاً. لسنا جهة رسمية ولا نبيع جولات. نحن مرصد حيّ لسوريا كما هي اليوم: معلومات مؤرخة، وأشخاص حقيقيون يجيبون، وصور من المكان نفسه.',
              "Syria Up Close is an independent, Arabic-first travel guide. We are not an official body and we don't sell tours. We are a live record of Syria as it is today: dated information, real people answering, photos from the place itself.",
            )}
          </p>
          <Lens
            label={T('مستوى الاقتراب', 'How close')}
            levels={[
              { label: T('من بعيد', 'From afar'), text: T('من بعيد، سوريا عناوين أخبار وصور جوية.', 'From afar, Syria is headlines and aerial shots.'), view: T('المدينة من فوق', 'The city from above'), scale: 1, bg: '#357560', fg: '#E8DCC8' },
              { label: T('أقرب', 'Closer'), text: T('أقرب، حارة لها اسم وأهل ورائحة خبز.', 'Closer, a street with a name, its people, the smell of bread.'), view: T('حارة قديمة', 'An old street'), scale: 1.6, bg: '#669A86', fg: '#052A1F' },
              { label: T('عن قرب', 'Up close'), text: T('عن قرب: مقبض باب، فنجان قهوة، بسطة سوق. هنا نعمل.', 'Up close: a door knocker, a cup of coffee, a market stall. This is where we work.'), view: T('مقبض باب دمشقي', 'A Damascene door knocker'), scale: 2.4, bg: '#D9C8AC', fg: '#3D3830' },
            ]}
          />
        </div>
      </section>

      <section className="s" id="independence">
        <div className="wrap">
          <SectionHead title={T('أربعة وعود. اقلب البطاقة.', 'Four promises. Flip the card.')} lede={T('اضغط على أي بطاقة لترى كيف نلتزم بالوعد فعلاً.', 'Press a card to see how we keep the promise.')} />
          <FlipCards
            hint={T('اضغط للقلب', 'Press to flip')}
            cards={[
              { title: T('مستقلون', 'Independent'), back: T('نكتب عن الأماكن لأنها تستحق، لا لأن أحداً دفع. لا نبيع رحلات.', "We write about places because they're worth it, not because someone paid. We don't sell trips.") },
              { title: T('كل شيء مؤرَّخ', 'Everything dated'), back: T('كل معلومة عملية عليها تاريخ آخر تحقق واسم من تحقق، والقديم يُعلَّم تلقائياً.', 'Every practical fact carries the date of the last check and who checked it; old ones are flagged automatically.') },
              { title: T('ناس على الأرض', 'People on the ground'), back: T('مراسل في كل مدينة يحدّث ويصوّر بنفسه، واسمه على كل تحديث.', 'A correspondent in each city updates and photographs it, signing every update.') },
              { title: T('لا أرقام مخترعة', 'No invented numbers'), back: T('لا نكتب ادعاءات عن الأمان أو الأسعار. ما لم يدخله إنسان يظهر: بانتظار أول تحقق.', 'We make no claims about safety or prices. Anything no person has entered shows: awaiting first check.') },
            ]}
          />
        </div>
      </section>

      <section className="s" id="how-we-check">
        <div className="wrap">
          <SectionHead title={T('كيف نتحقق: معلومة لها اسم وتاريخ', 'How we check: a fact with a name and a date')} />
          <Steps
            steps={[
              { title: T('المراسل يتحقق', 'The correspondent checks'), text: T('يزور المكان أو يتصل بمصدره، ويكتب الحال مع رابط المصدر.', 'Visits the place or calls its source, and writes the status with a link to the source.'), bg: '#E8DCC8', fg: '#052A1F' },
              { title: T('الاسم والتاريخ', 'Name and date'), text: T('الخادم يسجّل اسم المراسل وتاريخ التحقق تلقائياً، لا أحد يكتبهما يدوياً.', 'The server records who checked and when; nobody types them by hand.'), bg: '#669A86', fg: '#052A1F' },
              { title: T('التقادم', 'Ageing'), text: T('بعد 7 أيام بلا تحديث يظهر البند: قد تكون قديمة. وصفحات أول زيارة بعد 30 يوماً.', 'After 7 days without an update a line shows "may be out of date"; first-visit pages after 30 days.'), bg: '#D9A06E', fg: '#1C1915' },
            ]}
          />
        </div>
      </section>

      <section className="s" id="partnership">
        <div className="wrap stack" style={{ gap: 16 }}>
          <SectionHead title={T('الشراكة مع أهلين', 'Our partnership with Ahleen')} />
          <div className="where-sleep">
            <div className="a">
              <span className="kicker">{T('سوريا عن قرب', 'Syria Up Close')}</span>
              <span className="q">{T('وين نروح؟', 'Where do we go?')}</span>
              <p>{T('الأماكن، والموسم، وحال البلد اليوم، وناس على الأرض.', 'Places, seasons, the status today, and people on the ground.')}</p>
            </div>
            <div className="b">
              <span className="kicker">{T('أهلين', 'Ahleen')}</span>
              <span className="q">{T('وين ننام؟', 'Where do we sleep?')}</span>
              <p>{T('فنادق وبيوت ريفية بصور حقيقية مؤرخة، والحجز على منصة أهلين.', 'Hotels and rural homes with real, dated photos; booking on Ahleen.')}</p>
            </div>
          </div>
          <p>
            {T(
              'أهلين شريكنا لحجز الإقامة. الشراكة غير مدفوعة، ولا أحد يتقاضى منها عمولة أو أجراً. أزرار الحجز تظهر في صفحات المدن وجوّا سوريا وجاي من برّا فقط، حيث يحتاج القارئ إقامة فعلاً، ومعها سطر إفصاح. وفي تذييل كل صفحة رابط أهلين مع شعاره.',
              'Ahleen is our accommodation partner. The partnership is unpaid and nobody takes a commission or fee from it. Booking buttons appear only on city, In Syria and From abroad pages, where readers actually need a stay, with a disclosure line. Every page’s footer links to Ahleen with its logo.',
            )}
          </p>
        </div>
      </section>

      <section className="s" id="soap">
        <div className="wrap stack" style={{ gap: 14 }}>
          <span className="kicker">{T('تفصيلة من سوق المدينة · حلب', 'A detail from the Aleppo souq')}</span>
          <h2>{T('جرّب صابون الغار.', 'Try Aleppo laurel soap.')}</h2>
          <p style={{ color: 'var(--ink2)' }}>
            {T(
              'اضغط على الصابونة لتصنع رغوة، ثم امسح البلاطة بالمؤشر أو بإصبعك. هكذا نحب أن نعرّفك على سوريا: تجربة صغيرة حقيقية، لا صورة مصقولة.',
              'Press the bar to make lather, then rub the tile with your mouse or finger. That is how we like to introduce Syria: a small real experience, not a polished picture.',
            )}
          </p>
          <Soap
            text={{
              soap: T('صابونة غار: اضغط لصنع رغوة', 'Laurel soap: press to make lather'),
              press: T('اضغط على الصابونة', 'Press the soap'),
              ready: T('رغوة جاهزة، امسح البلاطة', 'Lather ready, rub the tile'),
              tile: T('بلاطة متسخة تُنظَّف بالرغوة', 'A dirty tile, cleaned with lather'),
              clean: T('النظافة', 'Clean'),
              again: T('من جديد', 'Again'),
              done: T('نظيفة! صابون حلب يُصنع من زيت الزيتون وزيت الغار.', 'Clean! Aleppo soap is made from olive oil and laurel oil.'),
            }}
          />
        </div>
      </section>

      <section className="band s">
        <div className="wrap stack" style={{ gap: 14 }}>
          <span className="kicker">{T('المورد الحاسم ليس المال، بل الناس', 'Our key resource is people, not money')}</span>
          <h2>{T('صوّر مدينتك. كن مراسلنا فيها.', 'Photograph your city. Be our correspondent there.')}</h2>
          <p>{T('نبحث عن طالب تصوير أو صانع محتوى في كل مدينة، يحدّث حالها كل أسبوع ويظهر باسمه.', 'We are looking for a photography student or creator in each city to update it weekly, under their own name.')}</p>
          <Link className="btn" href="/correspondent" style={{ justifySelf: 'start', background: 'var(--band-fg)', color: 'var(--band-bg)', borderColor: 'var(--band-fg)' }}>
            {T('دخول المراسلين', 'Correspondent sign-in')}
          </Link>
        </div>
      </section>
    </Page>
  )
}
