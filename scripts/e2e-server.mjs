// Hermetic e2e server (Playwright webServer): throwaway Postgres → migrate → seed → next build → next start.
// Never touches the dev database. Values mirror e2e/env.ts.
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const port = process.env.E2E_PORT ?? '3100'
const pg = { port: '54331', password: 'syria-e2e', db: 'syria_e2e' }
const dir = mkdtempSync(join(tmpdir(), 'syria-e2e-'))

const env = {
  ...process.env,
  NODE_ENV: 'production',
  DATABASE_URL: `postgres://syria:${pg.password}@localhost:${pg.port}/${pg.db}`,
  PAYLOAD_SECRET: 'e2e-only-secret',
  NEXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
  MEDIA_DIR: join(dir, 'media'),
  SHOW_KIT: '1',
  SEED_ADMIN_EMAIL: 'admin@e2e.test',
  SEED_ADMIN_PASSWORD: 'e2e-admin-password',
  SEED_CORRESPONDENT_EMAIL: 'damascus@e2e.test',
  SEED_CORRESPONDENT_PASSWORD: 'e2e-damascus-password',
}

const db = spawn(process.execPath, ['scripts/db.mjs'], {
  env: { ...process.env, PG_DIR: join(dir, 'data'), PG_PORT: pg.port, PG_DB: pg.db, PG_PASSWORD: pg.password },
  stdio: ['pipe', 'pipe', 'inherit'],
})
await new Promise((resolve, reject) => {
  db.stdout.on('data', (d) => d.toString().includes('postgres ready') && resolve())
  db.on('exit', (code) => reject(new Error(`e2e postgres exited (${code})`)))
})

const run = (args) => execFileSync(process.execPath, args, { env, stdio: 'inherit' })
run(['node_modules/payload/bin.js', 'migrate'])
run(['node_modules/payload/bin.js', 'run', 'src/seed/index.ts'])
// Webpack for production builds: smaller first load than Turbopack (keeps /correspondent under 150KB).
run(['node_modules/next/dist/bin/next', 'build', '--webpack'])

const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', port], { env, stdio: 'inherit' })

let stopping = false
async function shutdown() {
  if (stopping) return
  stopping = true
  // App first, so it doesn't see its database disappear mid-request.
  if (app.exitCode === null) {
    await new Promise((r) => {
      app.once('exit', r)
      app.kill()
      setTimeout(r, 10_000)
    })
  }
  await new Promise((r) => {
    db.once('exit', r)
    db.stdin.write('stop\n')
    setTimeout(r, 15_000)
  })
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 })
  } catch {
    // temp dir; Windows may still hold files
  }
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
app.on('exit', shutdown)
