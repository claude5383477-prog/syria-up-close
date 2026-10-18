import Link from 'next/link'
import { text } from '@/components/content'
import { DraftKeeper } from '@/correspondent/client/DraftKeeper'
import { PhotoInput } from '@/correspondent/client/PhotoInput'
import { submitReport } from '@/correspondent/actions'
import { requireCity } from '@/correspondent/session'
import { ErrorNote, Shell } from '@/correspondent/ui'
import { damascusDate } from '@/data/queries'

export const metadata = { title: 'تقرير موسم' }

type Props = { params: Promise<{ city: string }>; searchParams: Promise<{ error?: string }> }

export default async function ReportPage({ params, searchParams }: Props) {
  const { city: slug } = await params
  const { error } = await searchParams
  const { city } = await requireCity(slug)

  return (
    <Shell>
      <div>
        <Link href={`/correspondent/${slug}`} style={{ color: 'var(--ink2)', fontSize: 14 }}>
          ← حال {text(city.name, 'ar')}
        </Link>
        <h1>تقرير موسم</h1>
        <p style={{ color: 'var(--ink2)' }}>يُحفظ كمسودة ويصل للمحرر للمراجعة. لا يُنشر قبل موافقته.</p>
      </div>
      <ErrorNote code={error} />
      <form action={submitReport} className="c-form c-card">
        <DraftKeeper draftKey={`report:${slug}`} sent={false} />
        <input type="hidden" name="city" value={slug} />
        <label>
          العنوان
          <input name="title" required maxLength={120} placeholder="مثال: أول ثلج على بلودان" />
        </label>
        <label>
          تاريخ المشاهدة
          <input name="fieldDate" type="date" required defaultValue={damascusDate()} />
        </label>
        <label>
          التقرير
          <textarea name="body" rows={8} placeholder="ماذا رأيت؟ حال الطريق، الوقت المناسب للزيارة…" />
        </label>
        <PhotoInput />
        <label>
          وصف الصورة (إلزامي إن أرفقت صورة)
          <input name="alt" maxLength={200} />
        </label>
        <input type="hidden" name="shotDate" value={damascusDate()} />
        <div className="c-actions">
          <button className="btn" type="submit">
            إرسال للمراجعة
          </button>
        </div>
      </form>
    </Shell>
  )
}
