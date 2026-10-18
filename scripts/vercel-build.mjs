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
run(['node_modules/next/dist/bin/next', 'build', '--webpack'], process.env)
