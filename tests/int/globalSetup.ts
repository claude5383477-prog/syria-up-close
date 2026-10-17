// Starts a throwaway PostgreSQL for the integration run (embedded-postgres, no Docker) and points Payload at it.
import EmbeddedPostgres from 'embedded-postgres'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export default async function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'syria-pgtest-'))
  const port = Number(process.env.PGTEST_PORT ?? 54330)
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    port,
    user: 'syria',
    password: 'syria-test',
    persistent: true, // we remove the dir ourselves; the library's own rm fails on Windows file locks
    onLog: () => {},
  })
  await pg.initialise()
  await pg.start()
  await pg.createDatabase('syria_test')

  process.env.DATABASE_URL = `postgres://syria:syria-test@localhost:${port}/syria_test`
  process.env.PAYLOAD_SECRET = 'integration-test-secret'
  process.env.MEDIA_DIR = join(dir, 'media')

  return async () => {
    await pg.stop()
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 })
    } catch {
      // Windows may hold the data dir briefly after shutdown; it lives in the OS temp folder.
    }
  }
}
