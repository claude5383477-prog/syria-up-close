import { afterEach, describe, expect, it, vi } from 'vitest'
import { mark, timed } from '@/lib/timing'

// Diagnostic only (criterion 3, PLAN.md): silent unless TIMING_LOGS=1.
afterEach(() => vi.unstubAllEnvs())

describe('timed', () => {
  it('returns the result and logs the step with its duration and the instance uptime', async () => {
    vi.stubEnv('TIMING_LOGS', '1')
    const lines: string[] = []
    expect(await timed('find cities', async () => 42, (l) => lines.push(l))).toBe(42)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^\[timing\] find cities \d+ms uptime=\d+s$/)
  })

  it('logs a failing step too, and rethrows', async () => {
    vi.stubEnv('TIMING_LOGS', '1')
    const lines: string[] = []
    await expect(timed('broken', async () => Promise.reject(new Error('x')), (l) => lines.push(l))).rejects.toThrow('x')
    expect(lines[0]).toMatch(/^\[timing\] broken /)
  })

  it('is silent by default', async () => {
    const lines: string[] = []
    expect(await timed('quiet', async () => 1, (l) => lines.push(l))).toBe(1)
    mark('quiet', (l) => lines.push(l))
    expect(lines).toEqual([])
  })
})

describe('mark', () => {
  it('logs the step with the wall-clock time and the instance uptime', () => {
    vi.stubEnv('TIMING_LOGS', '1')
    const lines: string[] = []
    mark('render city page', (l) => lines.push(l))
    expect(lines[0]).toMatch(/^\[timing\] render city page t=\d{13} uptime=-?\d+s$/)
  })
})
