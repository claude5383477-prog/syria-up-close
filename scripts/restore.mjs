// Restore a backup (T34): npm run restore -- backups/<file>.json.gz <env file with the target DATABASE_URL>
// Migrates the target to this code first, then replaces every public table's rows and compares counts.
// Refuses a non-local target unless --allow-remote is given (it overwrites everything there).
import { isLocal, printComparison, readBackup, readEnvFiles, restore } from './backup-lib.mjs'

const args = process.argv.slice(2)
const allowRemote = args.includes('--allow-remote')
const [file, ...envFiles] = args.filter((a) => a !== '--allow-remote')
if (!file || !envFiles.length) throw new Error('usage: npm run restore -- <backup.json.gz> <target env file> [--allow-remote]')
const vars = readEnvFiles(envFiles)
const target = vars.DATABASE_URL_UNPOOLED || vars.DATABASE_URL
if (!target) throw new Error('the target env file has no DATABASE_URL')
if (!isLocal(target) && !allowRemote) throw new Error('target is not local; pass --allow-remote to overwrite a remote database')
const dump = readBackup(file)
console.log(`restore: ${file} (from ${dump.source}, ${dump.createdAt})`)
const result = await restore(dump, target)
printComparison(result)
if (!result.ok) process.exit(1)
