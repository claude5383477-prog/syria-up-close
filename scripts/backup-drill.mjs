// Backup drill (T34): back up a database, restore it into a throwaway local Postgres, compare every
// table's row count. Repeat it after schema changes and at least monthly.
//   npm run backup:drill -- .env.production.local
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { backup, printComparison, readEnvFiles, restore } from './backup-lib.mjs'

const files = process.argv.slice(2)
if (!files.length) throw new Error('usage: npm run backup:drill -- <env file>')
const { file, dump } = await backup(readEnvFiles(files))
console.log(`drill: backed up ${dump.source} -> ${file}`)

const pg = { port: '54336', password: 'drill', db: 'drill' }
const dir = mkdtempSync(join(tmpdir(), 'suc-drill-'))
const db = spawn(process.execPath, ['scripts/db.mjs'], {
  env: { ...process.env, PG_DIR: join(dir, 'data'), PG_PORT: pg.port, PG_DB: pg.db, PG_PASSWORD: pg.password },
  stdio: ['pipe', 'pipe', 'inherit'],
})
await new Promise((res, rej) => {
  db.stdout.on('data', (d) => d.toString().includes('postgres ready') && res())
  db.on('exit', (c) => rej(new Error(`drill postgres exited ${c}`)))
})
let ok = false
try {
  const result = await restore(dump, `postgres://syria:${pg.password}@localhost:${pg.port}/${pg.db}`)
  printComparison(result)
  ok = result.ok
} finally {
  db.stdin.write('stop\n')
  await new Promise((r) => {
    db.once('exit', r)
    setTimeout(r, 15000)
  })
  rmSync(dir, { recursive: true, force: true })
}
console.log(ok ? 'drill: restore verified' : 'drill: FAILED')
process.exit(ok ? 0 : 1)
