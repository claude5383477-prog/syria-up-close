'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as LMap, LayerGroup, Marker, CircleMarker } from 'leaflet'
import { distanceKm, distanceText, type LatLng } from '@/lib/maplinks'

export type MapKind = 'restaurant' | 'cafe' | 'sweets' | 'sight' | 'park'
export type MapPoint = {
  id: string
  kind: MapKind
  name: string
  note?: string
  point: LatLng | null
  href: string
}

const KIND_COLOR: Record<MapKind, string> = {
  restaurant: '#B5713A',
  cafe: '#5B3A1E',
  sweets: '#C2410C',
  sight: '#0B4836',
  park: '#3F7A5E',
}
const KIND_ICON: Record<MapKind, string> = {
  restaurant: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9',
  cafe: 'M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M7 3v2M11 3v2',
  sweets: 'M12 3l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.5-4 6-.6z',
  sight: 'M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 10l10-6 10 6z',
  park: 'M12 22v-6M7 16h10l-5-12z',
}
const KINDS = Object.keys(KIND_COLOR) as MapKind[]

export type LiveMapText = {
  title: string
  kicker: string
  all: string
  kinds: Record<MapKind, { one: string; many: string }>
  locate: string
  locating: string
  located: string
  stop: string
  denied: string
  far: string
  go: string
  nearest: string
  count: string
  away: string
  noPin: string
  note: string
  region: string
}

const iconHtml = (kind: MapKind, on: boolean) =>
  `<span class="mk${on ? ' on' : ''}" style="background:${KIND_COLOR[kind]}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${KIND_ICON[kind]}"/></svg></span>`

/**
 * The city's live map: every place we list, filterable by kind, on real streets (OpenStreetMap). Leaflet and the tiles load only when the map scrolls near; GPS only when the reader asks.
 */
export function LiveMap({ center, points, locale, text: t, cityName }: { center: LatLng; points: MapPoint[]; locale: 'ar' | 'en'; text: LiveMapText; cityName: string }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<LMap | null>(null)
  const layer = useRef<LayerGroup | null>(null)
  const markers = useRef(new Map<string, Marker>())
  const meMarker = useRef<CircleMarker | null>(null)
  const watch = useRef<number | null>(null)
  const fittedFor = useRef<string | null>(null)
  const [ready, setReady] = useState(false)
  const [kind, setKind] = useState<MapKind | 'all'>('all')
  const [picked, setPicked] = useState<string | null>(null)
  const [me, setMe] = useState<LatLng | null>(null)
  const [geo, setGeo] = useState<'off' | 'asking' | 'on' | 'denied'>('off')

  const shown = useMemo(() => points.filter((p) => kind === 'all' || p.kind === kind), [points, kind])
  const sorted = useMemo(() => {
    const withD = shown.map((p) => ({
      p,
      d: me && p.point ? distanceKm(me, p.point) : null,
    }))
    if (me) withD.sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity))
    return withD
  }, [shown, me])
  const far = me ? distanceKm(me, center) > 40 : false

  // Load Leaflet when the map comes near the viewport.
  useEffect(() => {
    const el = box.current
    if (!el) return
    let cancelled = false
    const io = new IntersectionObserver(
      async (entries) => {
        if (!entries.some((e) => e.isIntersecting) || map.current) return
        io.disconnect()
        const L = (await import('leaflet')).default
        await import('leaflet/dist/leaflet.css')
        if (cancelled || map.current) return
        const m = L.map(el, {
          center: [center[0], center[1]],
          zoom: 14,
          scrollWheelZoom: false,
          attributionControl: true,
        })
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(m)
        map.current = m
        layer.current = L.layerGroup().addTo(m)
        setReady(true)
      },
      { rootMargin: '400px' },
    )
    io.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
    }
  }, [center])

  // Markers for the current filter; fit them in view the first time.
  useEffect(() => {
    if (!ready || !map.current || !layer.current) return
    let alive = true
    import('leaflet').then(({ default: L }) => {
      if (!alive || !layer.current || !map.current) return
      layer.current.clearLayers()
      markers.current.clear()
      const pts: [number, number][] = []
      for (const p of shown) {
        if (!p.point) continue
        const mk = L.marker([p.point[0], p.point[1]], {
          icon: L.divIcon({
            className: 'mk-wrap',
            html: iconHtml(p.kind, p.id === picked),
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
          title: `${t.kinds[p.kind].one}: ${p.name}`,
          alt: `${t.kinds[p.kind].one}: ${p.name}`,
          keyboard: true,
          zIndexOffset: p.id === picked ? 1000 : 0,
        })
        mk.on('click', () => setPicked(p.id))
        mk.addTo(layer.current)
        markers.current.set(p.id, mk)
        pts.push([p.point[0], p.point[1]])
      }
      // Fit the markers once per filter; a pick only restyles, so the map does not jump.
      if (pts.length && fittedFor.current !== kind) map.current.fitBounds(pts, { padding: [36, 36], maxZoom: 15 })
      fittedFor.current = kind
    })
    return () => {
      alive = false
    }
  }, [ready, shown, picked, kind, t])

  // The reader's own position.
  useEffect(() => {
    if (!ready || !map.current) return
    let alive = true
    import('leaflet').then(({ default: L }) => {
      if (!alive || !map.current) return
      if (!me) {
        meMarker.current?.remove()
        meMarker.current = null
        return
      }
      if (!meMarker.current) {
        meMarker.current = L.circleMarker([me[0], me[1]], {
          radius: 9,
          color: '#FFFFFF',
          weight: 3,
          fillColor: '#2563EB',
          fillOpacity: 1,
        }).addTo(map.current)
        if (!far) map.current.setView([me[0], me[1]], 15)
      } else meMarker.current.setLatLng([me[0], me[1]])
    })
    return () => {
      alive = false
    }
  }, [ready, me, far])

  useEffect(
    () => () => {
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current)
      map.current?.remove()
      map.current = null
    },
    [],
  )

  const locate = () => {
    if (geo === 'on' || geo === 'asking') {
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current)
      watch.current = null
      setMe(null)
      setGeo('off')
      return
    }
    if (!('geolocation' in navigator)) return setGeo('denied')
    setGeo('asking')
    watch.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMe([pos.coords.latitude, pos.coords.longitude])
        setGeo('on')
      },
      () => {
        setGeo('denied')
        setMe(null)
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    )
  }

  const focus = (p: MapPoint) => {
    setPicked(p.id)
    if (p.point && map.current) map.current.setView([p.point[0], p.point[1]], Math.max(map.current.getZoom(), 16))
  }

  const pick = points.find((p) => p.id === picked)
  const counts = KINDS.map((k) => [k, points.filter((p) => p.kind === k).length] as const).filter(([, n]) => n > 0)
  const status = geo === 'asking' ? t.locating : geo === 'denied' ? t.denied : geo === 'on' && far ? t.far : geo === 'on' ? t.located : ''

  return (
    <div className="livemap">
      <div className="lm-head">
        <div>
          <span className="eyebrow">{t.kicker}</span>
          <h2>{t.title}</h2>
        </div>
        <button type="button" className="locate" aria-pressed={geo === 'on'} onClick={locate}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
          {geo === 'on' || geo === 'asking' ? t.stop : t.locate}
        </button>
      </div>
      <div className="pills" role="group" aria-label={t.region}>
        <button type="button" className="pill" aria-pressed={kind === 'all'} onClick={() => setKind('all')}>
          {t.all}
        </button>
        {counts.map(([k, n]) => (
          <button key={k} type="button" className="pill" aria-pressed={kind === k} onClick={() => setKind(k)}>
            <span className="dot" style={{ background: KIND_COLOR[k] }} aria-hidden="true" />
            {t.kinds[k].many} ({n})
          </button>
        ))}
      </div>
      <p className="lm-status" aria-live="polite">
        {status}
      </p>
      <div className="lm-body">
        <div className="lm-map-wrap">
          <div ref={box} className="lm-map" role="region" aria-label={t.region} />
          {pick && (
            <div className="lm-card">
              <span className="k" style={{ color: KIND_COLOR[pick.kind] }}>
                {t.kinds[pick.kind].one}
                {me && pick.point ? ` · ${t.away.replace('{d}', distanceText(distanceKm(me, pick.point), locale))}` : ''}
              </span>
              <b>{pick.name}</b>
              {pick.note && <span className="n">{pick.note}</span>}
              <span className="row">
                <a className="go" href={pick.href} target="_blank" rel="noopener">
                  {t.go}
                </a>
                <button type="button" onClick={() => setPicked(null)}>
                  ×<span className="sr-only">{locale === 'ar' ? 'إغلاق' : 'Close'}</span>
                </button>
              </span>
            </div>
          )}
        </div>
        <div className="lm-list">
          <span className="lm-count">{me ? t.nearest : t.count.replace('{n}', String(shown.length))}</span>
          <ul>
            {sorted.map(({ p, d }) => (
              <li key={p.id}>
                {p.point ? (
                  <button type="button" aria-pressed={p.id === picked} onClick={() => focus(p)}>
                    <span className="dot" style={{ background: KIND_COLOR[p.kind] }} aria-hidden="true" />
                    <span className="txt">
                      <b>{p.name}</b>
                      <small>
                        {t.kinds[p.kind].one}
                        {d !== null ? ` · ${distanceText(d, locale)}` : ''}
                      </small>
                    </span>
                  </button>
                ) : (
                  <a href={p.href} target="_blank" rel="noopener">
                    <span className="dot" style={{ background: KIND_COLOR[p.kind] }} aria-hidden="true" />
                    <span className="txt">
                      <b>{p.name}</b>
                      <small>
                        {t.kinds[p.kind].one} · {t.noPin}
                      </small>
                    </span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="cap">{t.note.replace('{city}', cityName)}</p>
    </div>
  )
}
