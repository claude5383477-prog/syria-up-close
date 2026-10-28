import { indexNowKey } from '@/lib/indexnow'

// The IndexNow key file (lib/indexnow INDEXNOW_KEY_PATH). The key lives in the INDEXNOW_KEY environment
// variable, never in the repository, so it is served from here rather than from public/.
export const dynamic = 'force-dynamic'

export function GET() {
  const key = indexNowKey()
  if (!key) return new Response('Not found', { status: 404 })
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
