import Image from 'next/image'
import { Brand } from '@/components/Logo'
import type { Locale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'

const NOTE = {
  ar: 'دليل مستقل. لسنا جهة رسمية. المعلومات العملية مؤرخة بتاريخ آخر تحقق.',
  en: 'An independent guide, not an official body. Practical information is dated with its last check.',
} as const

export function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="site">
      <div className="wrap">
        <Brand href={localePath(locale, '/')} size={40} className="on-band" />
        <p className="foot-note">{NOTE[locale]}</p>
        {/* The partner, named and linked with its logo on every page (owner decision 2026-10-23, ق5). */}
        <a className="partner" href="https://ahleenbooking.com" target="_blank" rel="noopener">
          <span className="lines">
            <span lang="ar">
              بالشراكة مع <b>أهلين</b> · حجز فنادق وبيوت ريفية في سوريا
            </span>
            <span className="en" lang="en">
              In partnership with <b>Ahleen</b> · ahleenbooking.com <span aria-hidden="true">↗</span>
            </span>
          </span>
          <Image src="/brand/ahleen-green.svg" alt="" width={92} height={53} unoptimized />
          <span className="sr-only">{locale === 'ar' ? '(يفتح موقع أهلين في نافذة جديدة)' : '(opens the Ahleen site in a new tab)'}</span>
        </a>
      </div>
    </footer>
  )
}
