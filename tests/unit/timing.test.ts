import { describe, expect, it } from 'vitest'
import { timed } from '@/lib/timing'

describe('timed', () => {
  it('returns the result and logs the step with its duration and the instance uptime', async () => {
    const lines: string[] = []
    expect(await timed('find cities', async () => 42, (l) => lines.push(l))).toBe(42)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^\[timing\] find cities \d+ms uptime=\d+s$/)
  })

  it('logs a failing step too, and rethrows', async () => {
    const lines: string[] = []
    await expect(timed('broken', async () => Promise.reject(new Error('x')), (l) => lines.push(l))).rejects.toThrow('x')
    expect(lines[0]).toMatch(/^\[timing\] broken /)
  })
})
