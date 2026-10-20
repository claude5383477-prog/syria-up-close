/**
 * Server timing for public page data (observability, criterion 3): one log line per step, readable
 * in Vercel's runtime logs. `uptime` (seconds since the function instance started) tells a cold
 * instance from a warm one.
 */
export async function timed<T>(label: string, fn: () => Promise<T>, log: (line: string) => void = console.log): Promise<T> {
  const start = performance.now()
  try {
    return await fn()
  } finally {
    log(`[timing] ${label} ${Math.round(performance.now() - start)}ms uptime=${Math.round(process.uptime())}s`)
  }
}
