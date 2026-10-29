import { pageMetadata } from '@/lib/seo'
import { describe } from '@/lib/seoText'
import { SyrianFill } from '@/components/Patterns'
import { Page } from '@/components/Header'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/lib/i18n'
import { FlipCards, Lens, Soap, Steps } from '@/components/client/About'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  return pageMetadata({
    locale,
    path: '/about',
    title: T('من نحن: دليل مستقل وكيف نتحقق', 'About: an independent guide, how we check'),
    description: describe([
      T('دليل سياحي مستقل عن سوريا، عربي أولاً. لسنا جهة رسمية ولا نبيع جولات', 'An independent, Arabic-first travel guide to Syria. Not an official body; we do not sell tours'),
      T('هنا كيف نتحقق من كل معلومة، وشراكتنا مع أهلين للإقامة', 'How we check every piece of information, and our partnership with Ahleen for stays'),
    ]),
  })
}

export default async function AboutPage({ params }: Props) {
  const { locale: l } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)

  return (
    <Page locale={locale} path="/about">
      <section className="dark about-hero">
        <SyrianFill id="khatam" opacity={0.1} />
        <div className="wrap">
          <Lens
            label={T('مستوى الاقتراب', 'How close')}
            intro={
              <>
                <span className="eyebrow rise">{T('من نحن', 'About')}</span>
                <h1 className="big rise2" style={{ fontSize: 'clamp(42px, 5.6vw, 72px)', lineHeight: 1.25 }}>
                  {T('عدسة تقترب من ', 'A lens that moves closer to ')}
                  <em>{T('التفاصيل الحقيقية.', 'real details.')}</em>
                </h1>
                <p className="lede rise3" style={{ maxWidth: 'none' }}>
                  {T(
                    'لسنا دليلاً سياحياً آخر. نحن مرصد حيّ لسوريا كما هي اليوم: معلومات مؤرخة، وأشخاص حقيقيون يجيبون، وصور من المكان نفسه.',
                    "We are not another travel guide. We are a live record of Syria as it is today: dated information, real people answering, photos from the place itself.",
                  )}
                </p>
              </>
            }
            levels={[
              { label: T('من بعيد', 'From afar'), text: T('من بعيد، سوريا عناوين أخبار وصور جوية.', 'From afar, Syria is headlines and aerial shots.'), view: T('المدينة من فوق', 'The city from above'), scale: 1, bg: '#357560', fg: '#E8DCC8' },
              { label: T('أقرب', 'Closer'), text: T('أقرب، حارة لها اسم وأهل ورائحة خبز.', 'Closer, a street with a name, its people, the smell of bread.'), view: T('حارة قديمة', 'An old street'), scale: 1.6, bg: '#669A86', fg: '#052A1F' },
              { label: T('عن قرب', 'Up close'), text: T('عن قرب: مقبض باب، فنجان قهوة، بسطة سوق. هنا نعمل.', 'Up close: a door knocker, a cup of coffee, a market stall. This is where we work.'), view: T('مقبض باب دمشقي', 'A Damascene door knocker'), scale: 2.4, bg: '#D9C8AC', fg: '#3D3830' },
            ]}
          />
        </div>
      </section>

      <section className="sec" id="independence" style={{ paddingTop: 88 }}>
        <div className="wrap">
          <div className="sec-head" style={{ marginBottom: 32 }}>
            <div>
              <span className="eyebrow">{T('بماذا نختلف', 'What makes us different')}</span>
              <h2 className="h-xl" style={{ fontSize: 'clamp(32px, 4.2vw, 48px)' }}>{T('أربعة وعود. اقلب البطاقة.', 'Four promises. Flip the card.')}</h2>
              <p>{T('اضغط على أي بطاقة لترى كيف نلتزم بالوعد فعلاً.', 'Press a card to see how we keep the promise.')}</p>
            </div>
          </div>
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

      <section className="sec" id="how-we-check" style={{ paddingBottom: 88 }}>
        <div className="wrap">
          <div className="sec-head" style={{ marginBottom: 32 }}>
            <div>
              <span className="eyebrow">{T('كيف نتحقق', 'How we check')}</span>
              <h2 className="h-xl" style={{ fontSize: 'clamp(32px, 4.2vw, 48px)' }}>{T('معلومة لها اسم وتاريخ.', 'A fact with a name and a date.')}</h2>
            </div>
          </div>
          <Steps
            steps={[
              { title: T('المراسل يتحقق', 'The correspondent checks'), text: T('يزور المكان أو يتصل بمصدره، ويكتب الحال مع رابط المصدر.', 'Visits the place or calls its source, and writes the status with a link to the source.'), bg: '#E8DCC8', fg: '#052A1F' },
              { title: T('الاسم والتاريخ', 'Name and date'), text: T('الخادم يسجّل اسم المراسل وتاريخ التحقق تلقائياً، لا أحد يكتبهما يدوياً.', 'The server records who checked and when; nobody types them by hand.'), bg: '#669A86', fg: '#052A1F' },
              { title: T('التقادم', 'Ageing'), text: T('بعد 7 أيام بلا تحديث يظهر البند: قد تكون قديمة. وصفحات أول زيارة بعد 30 يوماً.', 'After 7 days without an update a line shows "may be out of date"; first-visit pages after 30 days.'), bg: '#D9A06E', fg: '#1C1915' },
            ]}
          />
        </div>
      </section>

      <section className="sec alt">
        <div className="wrap" style={{ paddingBlock: 40 }}>
          <span className="eyebrow">{T('المعادلة', 'The equation')}</span>
          <h2 className="h-xl" style={{ fontSize: 'clamp(32px, 4.2vw, 48px)', margin: '8px 0 36px' }}>{T('من الصدق إلى الإقامة.', 'From honesty to a stay.')}</h2>
          <div className="chain2">
            {[
              [T('محتوى صادق ومؤرخ', 'Honest, dated content'), T('معلومة لها اسم وتاريخ ومصدر.', 'A fact with a name, a date and a source.')],
              [T('ثقة', 'Trust'), T('الزائر يعرف الوضع قبل أن يسافر.', 'Visitors know the situation before they travel.')],
              [T('زيارة متكررة', 'Coming back'), T('يرجع كل أسبوع ليعرف الجديد.', 'They come back every week for what is new.')],
              [T('إقامة عبر أهلين', 'A stay through Ahleen'), T('حين يقرر السفر، يحجز من مكان يثق به.', 'When they decide to travel, they book somewhere they trust.')],
            ].map(([title, body], i) => (
              <div key={title} className={`lift k${i + 1}`}>
                <span className="n">
                  {String(i + 1).padStart(2, '0')}
                  {i < 3 && T(' ←', ' →')}
                </span>
                <b>{title}</b>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="partnership" style={{ paddingBlock: 88 }}>
        <div className="wrap">
          <h2 className="sr-only">{T('الشراكة مع أهلين', 'Our partnership with Ahleen')}</h2>
          <div className="where-sleep">
            <div className="a">
              <span className="kicker">{T('سوريا عن قرب', 'Syria Up Close')}</span>
              <span className="q">{T('وين نروح؟', 'Where do we go?')}</span>
              <p>{T('الدليل: الأماكن، الموسم، حال البلد اليوم، وناس على الأرض.', 'The guide: places, seasons, the status today, and people on the ground.')}</p>
            </div>
            <div className="b">
              <span className="kicker">{T('أهلين', 'Ahleen')}</span>
              <span className="q">{T('وين ننام؟', 'Where do we sleep?')}</span>
              <p>{T('فنادق وبيوت ريفية بصور حقيقية مؤرخة، والحجز على منصة أهلين.', 'Hotels and rural homes with real, dated photos; booking on Ahleen.')}</p>
            </div>
          </div>
          <p className="copy" style={{ fontSize: 15, maxWidth: 820, marginTop: 18 }}>
            {T(
              'أهلين شريكنا لحجز الإقامة. الشراكة غير مدفوعة، ولا أحد يتقاضى منها عمولة أو أجراً. أزرار الحجز تظهر في صفحات المدن وجوّا سوريا وجاي من برّا فقط، حيث يحتاج القارئ إقامة فعلاً، ومعها سطر إفصاح. وفي تذييل كل صفحة رابط أهلين مع شعاره.',
              'Ahleen is our accommodation partner. The partnership is unpaid and nobody takes a commission or fee from it. Booking buttons appear only on city, In Syria and From abroad pages, where readers actually need a stay, with a disclosure line. Every page’s footer links to Ahleen with its logo.',
            )}
          </p>
        </div>
      </section>

      <section className="sec alt" id="soap">
        <div className="wrap stack" style={{ gap: 14, paddingBlock: 40 }}>
          <span className="eyebrow">{T('تفصيلة من سوق المدينة · حلب', 'A detail from the Aleppo souq')}</span>
          <h2 className="h-xl" style={{ fontSize: 'clamp(32px, 4.2vw, 48px)' }}>{T('جرّب صابون الغار.', 'Try Aleppo laurel soap.')}</h2>
          <p className="copy" style={{ fontSize: 17, marginBottom: 18 }}>
            {T(
              'اضغط على الصابونة لتصنع رغوة، ثم امسح البلاطة بالمؤشر أو بإصبعك. هكذا نحب أن نعرّفك على سوريا: تجربة صغيرة حقيقية، لا صورة مصقولة.',
              'Press the bar to make lather, then rub the tile with your mouse or finger. That is how we like to introduce Syria: a small real experience, not a polished picture.',
            )}
          </p>
          <Soap
            text={{
              soap: T('صابونة غار: اضغط لصنع رغوة', 'Laurel soap (غار): press to make lather'),
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

      <section className="dark">
        <SyrianFill id="vine" opacity={0.12} />
        <div className="wrap join-row">
          <div className="txt">
            <span className="eyebrow">{T('المورد الحاسم ليس المال، بل الناس', 'Our key resource is people, not money')}</span>
            <h2 className="h-2xl">{T('صوّر مدينتك. كن مراسلنا فيها.', 'Photograph your city. Be our correspondent there.')}</h2>
            <p className="copy">{T('نبحث عن طالب تصوير أو صانع محتوى في كل مدينة، يحدّث حالها كل أسبوع ويظهر باسمه.', 'We are looking for a photography student or creator in each city to update it weekly, under their own name.')}</p>
          </div>
          <Link className="btn-pill" href="/correspondent" style={{ minHeight: 56, padding: '0 30px', fontSize: 17 }}>
            {T('انضم كمراسل ←', 'Join as a correspondent →')}
          </Link>
        </div>
      </section>
    </Page>
  )
}
