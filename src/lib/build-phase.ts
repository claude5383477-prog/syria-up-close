/**
 * True only inside `next build` run with BUILD_WITHOUT_DB=1 (the Docker image build): there is no
 * database yet, so public queries return nothing and pages prerender empty. The container refreshes
 * every page on boot (scripts/docker/start.mjs → POST /api/revalidate-site), so visitors only ever
 * see pages rendered from the real database. NEXT_PHASE keeps a leaked flag inert at runtime.
 */
export function buildWithoutDatabase(env: Record<string, string | undefined> = process.env): boolean {
  return env.BUILD_WITHOUT_DB === '1' && env.NEXT_PHASE === 'phase-production-build'
}
