import { redirect } from 'next/navigation'
import { loginAction } from '@/correspondent/actions'
import { currentUser } from '@/correspondent/session'
import { ErrorNote, Shell } from '@/correspondent/ui'

export const metadata = { title: 'الدخول' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect('/correspondent')
  const { error } = await searchParams
  return (
    <Shell signedIn={false}>
      <h1>دخول المراسلين</h1>
      <ErrorNote code={error} />
      <form action={loginAction} className="c-form c-card">
        <label>
          البريد الإلكتروني
          <input name="email" type="email" autoComplete="username" inputMode="email" dir="ltr" required />
        </label>
        <label>
          كلمة السر
          <input name="password" type="password" autoComplete="current-password" dir="ltr" required />
        </label>
        <div className="c-actions">
          <button className="btn" type="submit">
            دخول
          </button>
        </div>
      </form>
    </Shell>
  )
}
