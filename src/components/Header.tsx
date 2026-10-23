import Link from 'next/link'
import type { ReactNode } from 'react'
import { Brand } from '@/components/Logo'
import type { Locale } from '@/lib/i18n'
import { isArabicOnly, localePath, switchLocalePath } from '@/lib/routing'

const NAV = [
  ['/', { ar: 'الرئيسية', en: 'Home' }],
  ['/inside', { ar: 'جوّا سوريا', en: 'In Syria' }],
  ['/outside', { ar: 'جاي من برّا', en: 'From abroad' }],
  ['/cities', { ar: 'المدن', en: 'Cities' }],
  ['/blog', { ar: 'المدونة', en: 'Blog' }],
  ['/about', { ar: 'من نحن', en: 'About' }],
] as const

const isCurrent = (path: string, section: string) => (section === '/' ? path === '/' : path === section || path.startsWith(`${section}/`))

/**
 * Server-rendered header. Each page passes its own path (language-neutral, e.g. "/cities/damascus"),
 * because prerendered HTML must not depend on the client pathname behind the locale rewrite.
 */
export function Header({ locale, path }: { locale: Locale; path: string }) {
  const here = localePath(locale, path)
  const other = locale === 'ar' ? { label: 'English', lang: 'en' } : { label: 'عربي', lang: 'ar' }
  return (
    <header className="top">
      <div className="wrap">
        <Brand href={localePath(locale, '/')} />
        <nav className="main" aria-label={locale === 'ar' ? 'الأقسام' : 'Sections'}>
          {NAV.map(([section, label]) => (
            <Link key={section} href={localePath(locale, section)} aria-current={isCurrent(path, section) ? 'page' : undefined}>
              {label[locale]}
            </Link>
          ))}
        </nav>
        {isArabicOnly(here) ? (
          <span className="lang" aria-disabled="true" lang={other.lang} title="هذا القسم بالعربية فقط">
            {other.label}
          </span>
        ) : (
          <Link className="lang" href={switchLocalePath(here)} lang={other.lang} hrefLang={other.lang}>
            {other.label}
          </Link>
        )}
      </div>
    </header>
  )
}

/** Header + main landmark for one page. */
export function Page({ locale, path, children }: { locale: Locale; path: string; children: ReactNode }) {
  return (
    <>
      <Header locale={locale} path={path} />
      <main id="main">{children}</main>
    </>
  )
}
