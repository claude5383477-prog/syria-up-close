import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Page } from '@/components/Header'
import { Crumbs, JsonLd, Loc } from '@/components/content'
import { SyrianFill } from '@/components/Patterns'
import { GuideAvatar, Verified, interestsOf, langLabel } from '@/components/guides'
import { BookingForm } from '@/components/client/BookingForm'
import { asDoc, getGuide, getGuides } from '@/data/queries'
import { isLocale, type Locale } from '@/lib/i18n'
import { breadcrumbLd, siteBase } from '@/lib/jsonld'
import { isTranslated, text } from '@/lib/localized'
import { localePath } from '@/lib/routing'
import { pageMetadata } from '@/lib/seo'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  return (await getGuides()).map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const g = isLocale(locale) ? await getGuide(slug) : null
  if (!g || !isLocale(locale)) return {}
  const name = text(g.name, locale) ?? slug
  const city = text(asDoc(g.city)?.name, locale)
  return pageMetadata({
    locale,
    path: `/guides/${slug}`,
    title: locale === 'ar' ? `${name}: دليل سياحي${city ? ` في ${city}` : ''}` : `${name}: tour guide${city ? ` in ${city}` : ''}`,
    description: text(g.bio, locale) ?? undefined,
    translated: isTranslated([g.bio], 'en'),
  })
}

export default async function GuidePage({ params }: Props) {
  const { locale: l, slug } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const g = await getGuide(slug)
  if (!g) notFound()
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const name = text(g.name, locale) ?? text(g.name, 'ar') ?? slug
  const city = asDoc(g.city)
  const cityName = city ? (text(city.name, locale) ?? city.slug) : ''
  const trips = (g.trips ?? []).flatMap((t) => {
    const title = text(t.title, locale)
    const dur = text(t.duration, locale)
    return t.id && title ? [{ id: t.id, label: dur ? `${title} (${dur})` : title }] : []
  })
  return (
    <Page locale={locale} path={`/guides/${slug}`}>
      <JsonLd
        data={breadcrumbLd(siteBase(), [
          { name: T('الأدلاء', 'Guides'), path: localePath(locale, '/guides') },
          ...(city ? [{ name: cityName, path: localePath(locale, `/cities/${city.slug}`) }] : []),
          { name },
        ])}
      />
      <section className="sec">
        <div className="wrap">
          <Crumbs items={[{ href: localePath(locale, '/guides'), label: T('الأدلاء', 'Guides') }, ...(city ? [{ href: localePath(locale, `/cities/${city.slug}`), label: cityName }] : []), { label: name }]} />
          <div className="profile">
            <div className="main">
              <div className="panel head">
                <GuideAvatar g={g} size={110} name={name} />
                <div className="who">
                  <h1>{name}</h1>
                  <Verified at={g.verifiedAt} locale={locale} long />
                  <span className="muted">{[cityName, text(g.area, locale)].filter(Boolean).join(' · ')}</span>
                  <div className="langs">
                    {(g.languages ?? []).map((x) => (
                      <span key={x} className="tag sand">
                        {langLabel(x, locale)}
                      </span>
                    ))}
                    {interestsOf(g, locale).map((x) => (
                      <span key={x} className="tag">
                        {x}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="panel">
                <h2>{T('عن الدليل', 'About the guide')}</h2>
                {text(g.bio, locale) || text(g.bio, 'ar') ? <Loc v={g.bio} locale={locale} as="p" /> : <p className="muted wait-box">{T('النبذة بانتظار الدليل والفريق.', 'The bio is on its way from the guide and our team.')}</p>}
              </div>
              <div className="panel">
                <h2>{T('المشاوير', 'Trips')}</h2>
                {trips.length ? (
                  <div className="trips-list">
                    {trips.map((t) => (
                      <div key={t.id} className="trip">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B5713A" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        <b>{t.label}</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted wait-box">{T('المشاوير بانتظار الدليل. بتقدر تقترح مشوارك بالنموذج.', 'Trips are on their way; you can suggest your own in the form.')}</p>
                )}
                <p className="fine">{T('الكلفة يتفق عليها الدليل معك وتوصلك مع التأكيد. ما منكتب أسعار بالموقع.', 'The guide agrees the cost with you; it comes with the confirmation. We publish no prices.')}</p>
              </div>
              <div className="panel syr-band before">
                <SyrianFill id="khatam" opacity={0.1} />
                <h2>{T('قبل ما تحجز', 'Before you book')}</h2>
                <ul>
                  <li>{T('منتأكد من هوية كل دليل ومن معرفته بالمنطقة قبل ما ننشره.', 'We check every guide’s identity and knowledge of the area before publishing.')}</li>
                  <li>{T('إذا ما قدر الدليل بالتاريخ اللي اخترته، منقترح عليك يوم تاني أو دليل تاني.', 'If the guide can’t make your date, we suggest another day or another guide.')}</li>
                  <li>{T('بتقدر تلغي الطلب برد على إيميل التأكيد.', 'You can cancel by replying to the confirmation e-mail.')}</li>
                  <li>
                    {T('بياناتك بتوصل للدليل بس بعد التأكيد، ولهالحجز بس. ', 'Your details reach the guide only after confirmation, for this booking only. ')}
                    <Link href={localePath(locale, '/about')}>{T('من نحن', 'About us')}</Link>
                  </li>
                </ul>
              </div>
            </div>
            <aside className="sticky-book" id="book">
              <div className="panel">
                <BookingForm
                  guide={g.id}
                  trips={trips}
                  languages={(g.languages ?? []).map((x) => ({ value: x, label: langLabel(x, locale) }))}
                  t={{
                    title: T('احجز الدليل', 'Book this guide'),
                    trip: T('المشوار', 'Trip'),
                    custom: T('مشوار تقترحه إنت', 'A trip you suggest'),
                    date: T('التاريخ', 'Date'),
                    people: T('عدد الأشخاص', 'People'),
                    language: T('لغة الجولة', 'Tour language'),
                    name: T('اسمك', 'Your name'),
                    phone: T('واتساب أو هاتف', 'WhatsApp or phone'),
                    email: T('الإيميل', 'E-mail'),
                    note: T('شي بدك ياه الدليل يعرفه', 'Anything the guide should know'),
                    notePh: T('مثلاً: معنا أولاد، أو بدنا نركّز على الأكل', 'e.g. we have children with us, or we want to focus on food'),
                    consent: T('موافق إنو تبعتولي التأكيد وتشاركوا اسمي ورقمي مع الدليل بس لهالحجز.', 'I agree that you send me the confirmation and share my name and number with the guide, for this booking only.'),
                    submit: T('ابعت طلب الحجز', 'Send the booking request'),
                    sending: T('عم نبعت…', 'Sending…'),
                    noPay: T('ما في دفع بالموقع. الحجز طلب، والتأكيد بيوصلك منا.', 'No payment on the site. This is a request; the confirmation comes from us.'),
                    done: T('وصلنا طلبك', 'We have your request'),
                    code: T('رقم الطلب:', 'Request number:'),
                    doneNote: T('منتواصل مع الدليل ومنرد عليك بالإيميل أو واتساب.', 'We will contact the guide and reply by e-mail or WhatsApp.'),
                    again: T('طلب جديد', 'New request'),
                    errors: {
                      trip: T('اختار مشوار.', 'Choose a trip.'),
                      date: T('اختار تاريخ من اليوم لقدّام.', 'Choose a date from today on.'),
                      people: T('من 1 لـ 30 شخص.', 'From 1 to 30 people.'),
                      language: T('اختار لغة من لغات الدليل.', 'Choose one of the guide’s languages.'),
                      name: T('اكتب اسمك.', 'Write your name.'),
                      phone: T('اكتب الرقم بالأرقام، مثل +963…', 'Digits only, like +963…'),
                      email: T('اكتب إيميل صحيح، مثل name@example.com.', 'A valid e-mail, like name@example.com.'),
                      note: T('الملاحظة طويلة كتير.', 'The note is too long.'),
                      consent: T('لازم توافق على مشاركة بياناتك مع الدليل لنقدر نحجز.', 'Please agree to share your details with the guide so we can book.'),
                    },
                    failed: T('ما وصل الطلب. جرّب مرة ثانية بعد شوي.', 'The request did not go through. Please try again shortly.'),
                    rate: T('وصلنا كذا طلب من نفس الجهاز. جرّب بعد ربع ساعة.', 'Several requests from this device already. Please try again in 15 minutes.'),
                  }}
                />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </Page>
  )
}
