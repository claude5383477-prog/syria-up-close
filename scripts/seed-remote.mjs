// One-off seed of a deployed site's database (the Neon `production` branch) from an env file the
// owner fills in on this machine; values are never printed or passed on the command line.
//   npm run seed:remote -- .env.production.local
// The file (ignored by git: .env.*) must hold, for ONE Neon branch:
//   DATABASE_URL (pooled), DATABASE_URL_UNPOOLED (direct), PAYLOAD_SECRET (same as on Vercel),
//   NEXT_PUBLIC_SITE_URL (the deployed site), SEED_ADMIN_EMAIL/PASSWORD, SEED_CORRESPONDENT_EMAIL/PASSWORD.
// Steps: migrate (normally nothing pending; Vercel's build ran them), seed on the direct connection,
// then refresh the deployed site's pages.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { databaseEndpoint, migrationUrl } from '../src/lib/neon.ts'
import { revalidate } from './revalidate.mjs'

const file = process.argv[2]
if (!file) throw new Error('usage: npm run seed:remote -- <env file>')
const vars = parseEnv(readFileSync(file, 'utf8'))
const required = ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'PAYLOAD_SECRET', 'NEXT_PUBLIC_SITE_URL', 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD', 'SEED_CORRESPONDENT_EMAIL', 'SEED_CORRESPONDENT_PASSWORD']
const missing = required.filter((k) => !vars[k])
// Every value must come from this file: a gap would otherwise be filled from the dev .env.
if (missing.length) throw new Error(`${file} is missing: ${missing.join(', ')}`)
if (/localhost|127\.0\.0\.1/.test(vars.DATABASE_URL)) throw new Error(`${file} points at a local database; this script is for a deployed one`)

const direct = migrationUrl(vars)
const env = { ...process.env, ...vars, DATABASE_URL: direct, NODE_ENV: 'production' }
console.log(`seed:remote: database ${databaseEndpoint(direct)}, site ${vars.NEXT_PUBLIC_SITE_URL}`)
const payload = (...args) => execFileSync(process.execPath, ['node_modules/payload/bin.js', ...args], { env, stdio: 'inherit' })
payload('migrate')
payload('run', 'src/seed/index.ts')
await revalidate({ base: vars.NEXT_PUBLIC_SITE_URL, secret: vars.PAYLOAD_SECRET, timeoutMs: 60_000 })
console.log('seed:remote: done, public pages refreshed')
