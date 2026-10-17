// Local PostgreSQL for development, via embedded-postgres (no Docker needed). Docker is for deployment only (T33).
// Usage: npm run db   → keeps running until Ctrl+C. Data lives in .pgdata/ (gitignored).
import EmbeddedPostgres from 'embedded-postgres'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = resolve('.pgdata')
const port = Number(process.env.PGPORT ?? 54329)
const fresh = !existsSync(dir)

const pg = new EmbeddedPostgres({
  databaseDir: dir,
  port,
  user: 'syria',
  password: 'syria-local-dev',
  persistent: true,
  onLog: () => {},
})

if (fresh) await pg.initialise()
await pg.start()
for (const name of ['syria_dev']) {
  try {
    await pg.createDatabase(name)
  } catch {
    // already exists
  }
}
console.log(`postgres ready: postgres://syria:syria-local-dev@localhost:${port}/syria_dev  (Ctrl+C to stop)`)

const stop = async () => {
  await pg.stop()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
