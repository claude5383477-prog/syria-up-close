// Shared by backup.mjs, restore.mjs and backup-drill.mjs (T34). Logic: src/data/backup.ts.
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'
import { gunzipSync, gzipSync } from 'node:zlib'
import pg from 'pg'
import { dumpCounts, dumpDatabase, restoreDatabase, rowCounts } from '../src/data/backup.ts'
import { decryptBackup, encryptBackup, isLocal } from '../src/lib/backup-crypto.ts'
import { databaseEndpoint, migrationUrl } from '../src/lib/neon.ts'

export const readEnvFiles = (files) => Object.assign({}, ...files.map((f) => parseEnv(readFileSync(f, 'utf8'))))
export { isLocal }

const KEY_FILE = '.env.backup.local'

/**
 * The backup passphrase, from the git-ignored .env.backup.local. A backup creates it once if missing
 * (never printed): keep a copy in a password manager, or the backups cannot be read.
 */
export function backupPassphrase({ create = false } = {}) {
  if (existsSync(KEY_FILE)) {
    const value = parseEnv(readFileSync(KEY_FILE, 'utf8')).BACKUP_PASSPHRASE
    if (value) return value
  }
  if (!create) throw new Error(`${KEY_FILE} with BACKUP_PASSPHRASE is needed to read a backup`)
  const value = randomBytes(32).toString('base64url')
  const header = '# Encrypts backups/ (npm run backup). Keep a copy in a password manager; without it backups cannot be read.'
  writeFileSync(KEY_FILE, `${header}\nBACKUP_PASSPHRASE=${value}\n`, { mode: 0o600 })
  console.log(`backup: created ${KEY_FILE} (the encryption passphrase). Save a copy in your password manager.`)
  return value
}

async function withClient(url, fn) {
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

/** Backs up the database of the env (direct connection), writes backups/<time>-<endpoint>.json.gz.gpg (encrypted only). */
export async function backup(vars) {
  const url = migrationUrl(vars)
  const source = databaseEndpoint(url)
  const passphrase = backupPassphrase({ create: true })
  const dump = await withClient(url, (c) => dumpDatabase(c, source))
  mkdirSync('backups', { recursive: true })
  const file = join('backups', `${dump.createdAt.replace(/[-:]/g, '').replace(/\..*/, '')}-${source.replace(/[^\w.-]/g, '_')}.json.gz.gpg`)
  writeFileSync(file, await encryptBackup(gzipSync(JSON.stringify(dump)), passphrase))
  return { file, dump }
}

/** Reads an encrypted backup (.gpg); a legacy unencrypted .json.gz is still readable. */
export async function readBackup(file) {
  const raw = readFileSync(file)
  const gz = file.endsWith('.gpg') ? await decryptBackup(raw, backupPassphrase()) : raw
  return JSON.parse(gunzipSync(gz).toString('utf8'))
}

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
