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
  ['/guides', { ar: 'أدلاء سياحيون', en: 'Tour guides' }],
  ['/videos', { ar: 'عدسات', en: 'Videos' }],
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
        <Link className="hsearch" href={`${localePath(locale, '/')}#search`} aria-label={locale === 'ar' ? 'ابحث عن مدينة أو مكان' : 'Search for a city or place'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </Link>
        {/* Phones: the sections in a drop-down menu instead of a sideways-scrolling strip (review 2026-10-26). Works without JavaScript. */}
        <details className="mnav">
          <summary aria-label={locale === 'ar' ? 'القائمة' : 'Menu'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            <span className="lbl">{locale === 'ar' ? 'القائمة' : 'Menu'}</span>
          </summary>
          <nav className="drawer" aria-label={locale === 'ar' ? 'قائمة الأقسام' : 'Sections menu'}>
            {NAV.map(([section, label]) => (
              <Link key={section} href={localePath(locale, section)} aria-current={isCurrent(path, section) ? 'page' : undefined}>
                {label[locale]}
              </Link>
            ))}
            {!isArabicOnly(here) && (
              <Link href={switchLocalePath(here)} lang={other.lang} hrefLang={other.lang}>
                {other.label}
              </Link>
            )}
          </nav>
        </details>
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
