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
        <div>
          <Brand href={localePath(locale, '/')} size={32} className="on-band" />
          <small>{NOTE[locale]}</small>
        </div>
        {/* Disclosure only — no booking link here (content rule ق5). */}
        <div className="partner">
          <span lang="ar">
            بالشراكة مع <b>أهلين</b>
          </span>
          {' | '}
          <span className="en" lang="en">
            In partnership with <b>Ahleen</b>
          </span>
        </div>
      </div>
    </footer>
  )
}
