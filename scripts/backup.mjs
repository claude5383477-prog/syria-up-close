// Logical backup of a database (T34): npm run backup -- .env.production.local
// Reads DATABASE_URL / DATABASE_URL_UNPOOLED from the env file(s); uses the direct connection.
// The file in backups/ (git-ignored) holds every row, password hashes included: keep it private.
import { backup, readEnvFiles } from './backup-lib.mjs'

const files = process.argv.slice(2)
if (!files.length) throw new Error('usage: npm run backup -- <env file> [more env files]')
const { file, dump } = await backup(readEnvFiles(files))
const rows = Object.values(dump.tables).reduce((n, t) => n + t.rows.length, 0)
console.log(`backup: ${dump.source}, ${Object.keys(dump.tables).length} tables, ${rows} rows, ${dump.migrations.length} migrations -> ${file}`)
