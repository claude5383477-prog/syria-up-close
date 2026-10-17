// Local PostgreSQL via embedded-postgres (no Docker needed). Docker is for deployment only (T33).
//   npm run db               → dev server on :54329, data in .pgdata/ (gitignored), Ctrl+C to stop.
// The integration tests start a throwaway instance through this same script (tests/int/globalSetup.ts):
//   PG_DIR, PG_PORT, PG_DB, PG_PASSWORD override the defaults; writing "stop" to stdin shuts it down cleanly.
import EmbeddedPostgres from 'embedded-postgres'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = resolve(process.env.PG_DIR ?? '.pgdata')
const port = Number(process.env.PG_PORT ?? 54329)
const db = process.env.PG_DB ?? 'syria_dev'
const password = process.env.PG_PASSWORD ?? 'syria-local-dev'

const pg = new EmbeddedPostgres({ databaseDir: dir, port, user: 'syria', password, persistent: true, onLog: () => {} })

if (!existsSync(dir)) await pg.initialise()
await pg.start()
try {
  await pg.createDatabase(db)
} catch {
  // already exists
}
console.log(`postgres ready: postgres://syria:${password}@localhost:${port}/${db}`)

let stopping = false
const stop = async () => {
  if (stopping) return
  stopping = true
  await pg.stop()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
process.stdin.on('data', (d) => {
  if (String(d).trim() === 'stop') void stop()
})
