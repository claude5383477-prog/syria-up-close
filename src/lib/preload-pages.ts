import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

/**
 * Public page modules, the city page first (criterion 3: a status update must show on the city
 * page within 5 s). Measured on Vercel: the first render of a route on an instance spent ~1.9 s
 * loading the page module before rendering started (data took ~0.25 s). Next's own
 * preloadEntriesOnStart is off in Vercel's minimal mode, so instrumentation does it instead.
 */
export const PUBLIC_PAGES = [
  'cities/[slug]',
  '',
  'cities',
  'inside',
  'outside',
  'outside/first-visit',
  'outside/first-visit/[topic]',
  'seasons',
  'seasons/[slug]',
  'about',
] as const

type Options = {
  root?: string
  exists?: (file: string) => boolean
  load?: (file: string) => unknown
  log?: (line: string) => void
  /** Yields between pages so requests arriving during start-up are not held up. */
  defer?: (fn: () => void) => void
}

/** Loads each public page module once, one per event-loop turn; never throws. */
export async function preloadPublicPages({
  root = process.cwd(),
  exists = existsSync,
  load = createRequire(path.join(root, 'preload.js')),
  log = console.log,
  defer = (fn) => setImmediate(fn),
}: Options = {}): Promise<void> {
  for (const page of PUBLIC_PAGES) {
    await new Promise<void>((resolve) => defer(resolve))
    const file = path.join(root, '.next', 'server', 'app', '(frontend)', '[locale]', page, 'page.js')
    const name = page || 'home'
    if (!exists(file)) {
      log(`[timing] preload ${name} missing`)
      continue
    }
    const start = performance.now()
    try {
      load(file)
      log(`[timing] preload ${name} ${Math.round(performance.now() - start)}ms`)
    } catch (err) {
      log(`[timing] preload ${name} failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
