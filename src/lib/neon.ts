/**
 * Neon gives each branch one endpoint (ep-…) with two hostnames: ep-….neon.tech (direct) and
 * ep-…-pooler.neon.tech (PgBouncer, transaction mode). The site uses the pooler; migrations and the
 * seed need the direct connection (session features, advisory locks).
 */
export function databaseEndpoint(url: string): string {
  const { hostname, port } = new URL(url)
  const first = hostname.split('.')[0]!
  return first.startsWith('ep-') ? first.replace(/-pooler$/, '') : `${hostname}:${port || '5432'}`
}

/** The connection string migrations should use; refuses a direct string for a different branch. */
export function migrationUrl(env: Record<string, string | undefined>): string {
  const site = env.DATABASE_URL
  if (!site) throw new Error('DATABASE_URL is not set')
  const direct = env.DATABASE_URL_UNPOOLED
  if (!direct) return site
  if (databaseEndpoint(direct) !== databaseEndpoint(site)) {
    throw new Error(`DATABASE_URL and DATABASE_URL_UNPOOLED point at different databases (${databaseEndpoint(site)} vs ${databaseEndpoint(direct)})`)
  }
  return direct
}
