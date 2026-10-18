import { text } from '@/lib/localized'
import { Stamp } from '@/components/Stamp'
import { ClearDraft, DraftKeeper } from '@/correspondent/client/DraftKeeper'
import { PhotoInput } from '@/correspondent/client/PhotoInput'
import { addPhoto, confirmStatus, saveStatus } from '@/correspondent/actions'
import { MAX_STATUS_CHARS } from '@/correspondent/logic'
import { requireCity } from '@/correspondent/session'
import { ErrorNote, OkNote, Shell } from '@/correspondent/ui'
import { damascusDate, getSettings, payloadClient } from '@/data/queries'

export const metadata = { title: 'حال المدينة' }

const TYPES = [
  ['electricity', 'الكهرباء'],
  ['internet', 'الإنترنت'],
  ['roads', 'الطرق'],
  ['weather', 'الطقس'],
  ['events', 'الفعاليات'],
] as const

type Props = {
  params: Promise<{ city: string }>
  searchParams: Promise<{ error?: string; at?: string; saved?: string; confirmed?: string }>
}

export default async function CityStatusPage({ params, searchParams }: Props) {
  const { city: slug } = await params
  const q = await searchParams
  const { user, city } = await requireCity(slug)
  const p = await payloadClient()
  const [{ docs: items }, settings] = await Promise.all([
    p.find({ collection: 'statusItems', where: { city: { equals: city.id } }, depth: 0, locale: 'ar', user, overrideAccess: false }),
    getSettings(),
  ])
  const byType = new Map(items.map((i) => [i.type, i]))
  const cityName = text(city.name, 'ar') ?? slug
  const maxAge = settings.staleness?.statusDays ?? 7

  return (
    <Shell>
      <div>
        <h1>حال {cityName} اليوم</h1>
        <p style={{ color: 'var(--ink2)' }}>كل حفظ يُنشر فوراً باسمك وتاريخ اليوم.</p>
      </div>
      {!q.at && <ErrorNote code={q.error} />}

      {TYPES.map(([type, label]) => {
        const item = byType.get(type)
        return (
          <section className="c-card" id={type} key={type} aria-labelledby={`h-${type}`}>
            <div className="head">
              <h2 id={`h-${type}`}>{label}</h2>
              <Stamp verifiedAt={item?.verifiedAt ?? null} maxAgeDays={maxAge} locale="ar" />
            </div>
            {q.at === type && <ErrorNote code={q.error} />}
            {q.saved === type && <OkNote>حُفظت ونُشرت.</OkNote>}
            {q.confirmed === type && <OkNote>جُدّد تاريخ التحقق.</OkNote>}
            <form action={saveStatus} className="c-form">
              <DraftKeeper draftKey={`status:${slug}:${type}`} sent={q.saved === type || q.confirmed === type} />
              <input type="hidden" name="city" value={slug} />
              <input type="hidden" name="type" value={type} />
              {item && <input type="hidden" name="id" value={item.id} />}
              <label>
                الحالة الآن
                <textarea name="value" required maxLength={MAX_STATUS_CHARS} defaultValue={item?.value ?? ''} />
                <span className="hint">حتى {MAX_STATUS_CHARS} حرفاً. وقائع فقط، بلا تقييمات أمنية.</span>
              </label>
              <label>
                رابط المصدر (اختياري)
                <input name="sourceUrl" type="url" inputMode="url" dir="ltr" placeholder="https://" defaultValue={item?.sourceUrl ?? ''} />
              </label>
              <div className="c-actions">
                <button className="btn" type="submit">
                  حفظ ونشر
                </button>
                {item && (
                  <button className="btn ghost" type="submit" formAction={confirmStatus} formNoValidate>
                    لا تغيير، تم التحقق اليوم
                  </button>
                )}
              </div>
            </form>
          </section>
        )
      })}

      <section className="c-card" id="photo" aria-labelledby="h-photo">
        <h2 id="h-photo">رفع صورة</h2>
        {q.at === 'photo' && <ErrorNote code={q.error} />}
        {q.saved === 'photo' && <OkNote>رُفعت الصورة. يختار المحرر أين تُستخدم.</OkNote>}
        <form action={addPhoto} className="c-form">
          <DraftKeeper draftKey={`photo:${slug}`} sent={q.saved === 'photo'} />
          <input type="hidden" name="city" value={slug} />
          <PhotoInput />
          <label>
            وصف اللقطة (إلزامي)
            <input name="alt" required maxLength={200} placeholder="مثال: ضوء على بلاط باب توما بعد المطر" />
          </label>
          <label>
            تاريخ اللقطة
            <input name="shotDate" type="date" defaultValue={damascusDate()} />
          </label>
          <div className="c-actions">
            <button className="btn" type="submit">
              رفع
            </button>
          </div>
        </form>
      </section>

      <section className="c-card" id="report" aria-labelledby="h-report">
        <h2 id="h-report">تقرير موسم</h2>
        <ClearDraft draftKey={`report:${slug}`} when={q.saved === 'report'} />
        {q.saved === 'report' && <OkNote>أُرسل التقرير للمراجعة. ينشره المحرر بعد قراءته.</OkNote>}
        <p className="current">ثلج، قطاف، زهر… تقرير قصير بتاريخه يراجعه المحرر قبل النشر.</p>
        <div className="c-actions">
          <a className="btn ghost" href={`/correspondent/${slug}/report`}>
            إرسال تقرير موسم
          </a>
        </div>
      </section>
    </Shell>
  )
}
