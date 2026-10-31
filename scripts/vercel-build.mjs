// Vercel build command (vercel.json): migrations on the direct Neon connection, then the Next build,
// which prerenders the public pages from that same branch through the pooler. Payload recommends
// migrating at build time on Vercel (prodMigrations would slow every serverless cold start), and a
// failed migration fails the deployment, so the live site never runs against an older schema.
import { execFileSync } from 'node:child_process'
import { databaseEndpoint, migrationUrl } from '../src/lib/neon.ts'

const run = (args, env) => execFileSync(process.execPath, args, { stdio: 'inherit', env })
const direct = migrationUrl(process.env)
console.log(`vercel-build: migrating ${process.env.VERCEL_ENV ?? 'local'} database ${databaseEndpoint(direct)}`)
run(['node_modules/payload/bin.js', 'migrate'], { ...process.env, DATABASE_URL: direct })
// Production only: refresh the sourced text content (status, first visit, researched venues and lore)
// before the pages are prerendered. A failure is logged and never blocks the deployment.
if (process.env.VERCEL_ENV === 'production') {
  try {
    run(['node_modules/payload/bin.js', 'run', 'src/seed/content.ts'], { ...process.env, DATABASE_URL: direct, SEED_RESEARCH_ONLY: '1' })
  } catch (err) {
    console.warn(`vercel-build: content refresh failed, deploying anyway: ${err instanceof Error ? err.message : err}`)
  }
}
run(['node_modules/next/dist/bin/next', 'build', '--webpack'], process.env)
