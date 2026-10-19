// Shared by backup.mjs, restore.mjs and backup-drill.mjs (T34). Logic: src/data/backup.ts.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'
import { gunzipSync, gzipSync } from 'node:zlib'
import pg from 'pg'
import { dumpCounts, dumpDatabase, restoreDatabase, rowCounts } from '../src/data/backup.ts'
import { databaseEndpoint, migrationUrl } from '../src/lib/neon.ts'

export const readEnvFiles = (files) => Object.assign({}, ...files.map((f) => parseEnv(readFileSync(f, 'utf8'))))
export const isLocal = (url) => /@(localhost|127\.0\.0\.1)[:/]/.test(url)

async function withClient(url, fn) {
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

/** Backs up the database of the env (direct connection), writes backups/<time>-<endpoint>.json.gz. */
export async function backup(vars) {
  const url = migrationUrl(vars)
  const source = databaseEndpoint(url)
  const dump = await withClient(url, (c) => dumpDatabase(c, source))
  mkdirSync('backups', { recursive: true })
  const file = join('backups', `${dump.createdAt.replace(/[-:]/g, '').replace(/\..*/, '')}-${source.replace(/[^\w.-]/g, '_')}.json.gz`)
  writeFileSync(file, gzipSync(JSON.stringify(dump)))
  return { file, dump }
}

export const readBackup = (file) => JSON.parse(gunzipSync(readFileSync(file)).toString('utf8'))

/** Migrates the target to this code's migrations, restores the dump, returns the per-table comparison. */
export async function restore(dump, targetUrl) {
  execFileSync(process.execPath, ['node_modules/payload/bin.js', 'migrate'], {
    env: { ...process.env, DATABASE_URL: targetUrl, PAYLOAD_SECRET: process.env.PAYLOAD_SECRET || 'restore-only' },
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  await withClient(targetUrl, (c) => restoreDatabase(c, dump))
  const expected = dumpCounts(dump)
  const actual = await withClient(targetUrl, rowCounts)
  const rows = Object.keys({ ...expected, ...actual }).sort().map((t) => ({ table: t, backup: expected[t] ?? 0, restored: actual[t] ?? 0 }))
  return { rows, ok: rows.every((r) => r.backup === r.restored) }
}

export function printComparison({ rows, ok }) {
  const nonEmpty = rows.filter((r) => r.backup || r.restored)
  for (const r of nonEmpty) console.log(`${r.table.padEnd(40)} ${String(r.backup).padStart(6)} ${String(r.restored).padStart(6)} ${r.backup === r.restored ? 'ok' : 'MISMATCH'}`)
  console.log(`${rows.length} tables (${nonEmpty.length} with rows): ${ok ? 'every count matches' : 'COUNTS DIFFER'}`)
}
