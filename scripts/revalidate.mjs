// Refreshes every public page through POST /api/revalidate-site (hooks/revalidate). Used by the
// container on boot and after `npm run seed`: both change data outside a Next request, where
// publishing hooks cannot reach the page cache. Waits for the server to answer first.
// Usage: npm run revalidate   (PAYLOAD_SECRET and PORT from the environment)
import { pathToFileURL } from 'node:url'

export async function revalidate({ port = process.env.PORT ?? '3000', secret = process.env.PAYLOAD_SECRET, timeoutMs = 120_000 } = {}) {
  const url = `http://127.0.0.1:${port}/api/revalidate-site`
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'x-revalidate-secret': secret ?? '' } })
      if (res.ok) return
      throw new Error(`revalidate-site answered ${res.status}`)
    } catch (err) {
      // Not listening yet: retry until the deadline. A real refusal (401) is final.
      if (err instanceof Error && err.message.startsWith('revalidate-site')) throw err
      if (Date.now() > deadline) throw new Error(`server on port ${port} did not answer within ${timeoutMs / 1000}s`)
      await new Promise((r) => setTimeout(r, 500))
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await revalidate()
  console.log('public pages refreshed')
}
