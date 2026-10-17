// Starts a throwaway PostgreSQL for the integration run and builds its schema from the committed migrations.
// Postgres runs in a child process (scripts/db.mjs): embedded-postgres installs an exit hook that would
// force exit code 0 and hide test failures if it were loaded in the Vitest process itself.
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export default async function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'syria-pgtest-'))
  const port = process.env.PGTEST_PORT ?? '54330'
  const password = 'syria-test'

  const child = spawn(process.execPath, ['scripts/db.mjs'], {
    env: { ...process.env, PG_DIR: join(dir, 'data'), PG_PORT: port, PG_DB: 'syria_test', PG_PASSWORD: password },
    stdio: ['pipe', 'pipe', 'inherit'],
  })
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('test postgres did not start within 120s')), 120_000)
    child.stdout.on('data', (d: Buffer) => {
      if (d.toString().includes('postgres ready')) {
        clearTimeout(timer)
        resolve()
      }
    })
    child.on('exit', (code) => reject(new Error(`test postgres exited early (${code})`)))
  })

  process.env.DATABASE_URL = `postgres://syria:${password}@localhost:${port}/syria_test`
  process.env.PAYLOAD_SECRET = 'integration-test-secret'
  process.env.MEDIA_DIR = join(dir, 'media')

  // Same CLI production uses.
  execFileSync(process.execPath, ['node_modules/payload/bin.js', 'migrate'], { env: process.env, stdio: 'pipe' })

  return async () => {
    await new Promise<void>((resolve) => {
      child.once('exit', () => resolve())
      child.stdin.write('stop\n')
    })
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 })
    } catch {
      // Windows may hold files briefly after shutdown; the dir lives in the OS temp folder.
    }
  }
}
