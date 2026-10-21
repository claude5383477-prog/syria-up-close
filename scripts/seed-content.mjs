// Fills a database with the sourced starter content in seed-content/*.json (src/seed/content.ts).
// Fill-only and re-runnable: values people entered are never changed. Values are never printed.
//   npm run seed:content                                  → the deployed site (.env.production.local)
//   npm run seed:content -- .env                          → the local dev database
// Deployed: photos must go to the production Blob store, so BLOB_READ_WRITE_TOKEN is needed; when the
// env file lacks it, it is pulled once with the Vercel CLI into .env.blob.local (git-ignored).
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { databaseEndpoint, migrationUrl } from '../src/lib/neon.ts'
import { revalidate } from './revalidate.mjs'

const files = process.argv.slice(2).length ? process.argv.slice(2) : ['.env.production.local']
const load = (list) => Object.assign({}, ...list.map((f) => parseEnv(readFileSync(f, 'utf8'))))
let vars = load(files)
for (const k of ['DATABASE_URL', 'PAYLOAD_SECRET']) if (!vars[k]) throw new Error(`${files.join(' + ')} is missing ${k}`)
const local = /localhost|127\.0\.0\.1/.test(vars.DATABASE_URL)

if (!local && !vars.BLOB_READ_WRITE_TOKEN) {
  if (!existsSync('.env.blob.local')) {
    console.log('seed:content: pulling the production Blob token with the Vercel CLI into .env.blob.local')
    execFileSync('npx', ['-y', 'vercel', 'env', 'pull', '.env.blob.local', '--environment=production', '--yes'], { stdio: 'inherit', shell: process.platform === 'win32' })
  }
  // Only the Blob token: the pulled file also holds "[SENSITIVE]" placeholders for the database and secret.
  const token = load(['.env.blob.local']).BLOB_READ_WRITE_TOKEN
  if (token?.startsWith('vercel_blob_rw_')) vars = { ...vars, BLOB_READ_WRITE_TOKEN: token }
  else {
    // Text now, photos later: a run after the token is added fills in only the missing photos.
    console.log('seed:content: no Blob token (Vercel keeps it secret) → filling text only, no photos this time.')
    console.log('  For photos: put the line BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... in .env.blob.local, then run npm run seed:content again.')
    vars = { ...vars, SEED_NO_IMAGES: '1' }
  }
}

const database = migrationUrl(vars)
// Only what the run needs: the dev .env must not fill gaps for a deployed database.
const env = { ...process.env, ...vars, DATABASE_URL: database, NODE_ENV: local ? process.env.NODE_ENV : 'production' }
console.log(`seed:content: database ${databaseEndpoint(database)}${local ? ' (local)' : `, site ${vars.NEXT_PUBLIC_SITE_URL}`}`)
execFileSync(process.execPath, ['node_modules/payload/bin.js', 'run', 'src/seed/content.ts'], { env, stdio: 'inherit' })
if (!local && vars.NEXT_PUBLIC_SITE_URL) {
  await revalidate({ base: vars.NEXT_PUBLIC_SITE_URL, secret: vars.PAYLOAD_SECRET, timeoutMs: 60_000 })
  console.log('seed:content: done, public pages refreshed. Report: seed-content/REPORT.md')
}
