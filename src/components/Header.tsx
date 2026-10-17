'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brand } from '@/components/Logo'
import type { Locale } from '@/lib/i18n'
import { isArabicOnly, localePath, switchLocalePath } from '@/lib/routing'

const NAV = [
  ['/', { ar: 'الرئيسية', en: 'Home' }],
  ['/inside', { ar: 'جوّا سوريا', en: 'In Syria' }],
  ['/outside', { ar: 'جاي من برّا', en: 'From abroad' }],
  ['/cities', { ar: 'المدن', en: 'Cities' }],
  ['/seasons', { ar: 'تقارير الموسم', en: 'Season reports' }],
  ['/about', { ar: 'من نحن', en: 'About' }],
] as const

function isCurrent(pathname: string, href: string): boolean {
  return href === '/' || href === '/en' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export function Header({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? '/'
  const arabicOnly = isArabicOnly(pathname)
  const other = locale === 'ar' ? { label: 'English', lang: 'en' } : { label: 'عربي', lang: 'ar' }

  return (
    <header className="top">
      <div className="wrap">
        <Brand href={localePath(locale, '/')} label={locale === 'ar' ? 'سوريا عن قرب — الرئيسية' : 'Syria Up Close — Home'} />
        <nav className="main" aria-label={locale === 'ar' ? 'الأقسام' : 'Sections'}>
          {NAV.map(([path, label]) => {
            const href = localePath(locale, path)
            return (
              <Link key={path} href={href} aria-current={isCurrent(pathname, href) ? 'page' : undefined}>
                {label[locale]}
              </Link>
            )
          })}
        </nav>
        {arabicOnly ? (
          <span className="lang" aria-disabled="true" lang={other.lang} title="هذا القسم بالعربية فقط">
            {other.label}
          </span>
        ) : (
          <Link className="lang" href={switchLocalePath(pathname)} lang={other.lang} hrefLang={other.lang}>
            {other.label}
          </Link>
        )}
      </div>
    </header>
  )
}
