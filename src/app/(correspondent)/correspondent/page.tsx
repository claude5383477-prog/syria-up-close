import Link from 'next/link'
import { redirect } from 'next/navigation'
import { text } from '@/components/content'
import { homeFor } from '@/correspondent/logic'
import { requireCorrespondent } from '@/correspondent/session'
import { ErrorNote, Shell } from '@/correspondent/ui'

export const metadata = { title: 'مدني' }

export default async function CorrespondentHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireCorrespondent()
  const { error } = await searchParams
  const home = homeFor(user)
  if (home.kind === 'city' && !error) redirect(`/correspondent/${home.slug}`)

  return (
    <Shell>
      <h1>أهلاً {user.name}</h1>
      <ErrorNote code={error} />
      {user.assignedCities.length === 0 ? (
        <p className="c-msg info">لم تُعيَّن لك مدينة بعد. اطلب من المدير تعيين مدينتك.</p>
      ) : (
        <>
          <h2>اختر المدينة</h2>
          <ul className="c-list">
            {user.assignedCities.map((c) => (
              <li key={c.id}>
                <Link href={`/correspondent/${c.slug}`}>{text(c.name, 'ar') ?? c.slug}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Shell>
  )
}
