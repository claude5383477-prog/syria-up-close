'use client'

import { useRouter } from 'next/navigation'

/** The city switcher in a city page's hero: choosing a city opens its page. */
export function CityPicker({ label, current, options }: { label: string; current: string; options: { slug: string; name: string; href: string }[] }) {
  const router = useRouter()
  return (
    <div className="picker">
      <label htmlFor="city-pick">{label}</label>
      <select id="city-pick" value={current} onChange={(e) => router.push(options.find((o) => o.slug === e.target.value)?.href ?? '/')}>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  )
}
