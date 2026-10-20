/**
 * Server timing for public page data (observability, criterion 3): one log line per step, readable
 * in Vercel's runtime logs. `uptime` (seconds since the function instance started) tells a cold
 * instance from a warm one. Diagnostic only (criterion 3, PLAN.md): silent unless TIMING_LOGS=1.
 */
const enabled = () => process.env.TIMING_LOGS === '1'

/** Seconds since the instance started; -1 where the runtime has no process.uptime (edge). */
const uptime = () => (typeof process !== 'undefined' && typeof process.uptime === 'function' ? Math.round(process.uptime()) : -1)

export async function timed<T>(label: string, fn: () => Promise<T>, log: (line: string) => void = console.log): Promise<T> {
  if (!enabled()) return fn()
  const start = performance.now()
  try {
    return await fn()
  } finally {
    log(`[timing] ${label} ${Math.round(performance.now() - start)}ms uptime=${uptime()}s`)
  }
}

/** A point in time (epoch ms), to line up steps across functions: request entry, module load, render start. */
export function mark(label: string, log: (line: string) => void = console.log): void {
  if (!enabled()) return
  log(`[timing] ${label} t=${Date.now()} uptime=${uptime()}s`)
}
