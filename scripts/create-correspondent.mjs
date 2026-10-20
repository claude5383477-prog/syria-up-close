// Creates a correspondent account (owner rules, PLAN.md): an alias email without the real name, a
// random password written to a git-ignored local file and never printed, and the default display
// name "مراسل سوريا عن قرب في {المدينة}".
//   npm run correspondent:create -- --email <alias> --name "<real name>" --city <slug> [--env .env.production.local]
// Without --env it uses the local database (.env). The password file is accounts/<site>-<email>.txt:
// send it to the correspondent over a private channel, then delete it.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs, parseEnv } from 'node:util'
import { checkAliasEmail, generatePassword } from '../src/lib/new-correspondent.ts'
import { databaseEndpoint, migrationUrl } from '../src/lib/neon.ts'

const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' }, city: { type: 'string' }, env: { type: 'string', default: '.env' } } })
const { email, name, city, env: envFile } = values
if (!email || !name || !city) throw new Error('usage: npm run correspondent:create -- --email <alias> --name "<real name>" --city <slug> [--env <file>]')
const problem = checkAliasEmail(email, name)
if (problem) throw new Error(`refused: ${problem}`)

// Every value comes from this one file: a gap must not be filled from another environment.
const vars = parseEnv(readFileSync(envFile, 'utf8'))
for (const k of ['DATABASE_URL', 'PAYLOAD_SECRET']) if (!vars[k]) throw new Error(`${envFile} is missing ${k}`)
const database = migrationUrl(vars)
const site = vars.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const dir = 'accounts'
const file = join(dir, `${new URL(site).hostname}-${email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_')}.txt`)
try {
  execFileSync('git', ['check-ignore', '-q', file])
} catch {
  throw new Error(`${file} is not ignored by git; refusing to write a password there`)
}
if (existsSync(file)) throw new Error(`${file} already exists`)

// The password is on disk before the account exists, so it cannot be lost; removed if creation fails.
const password = generatePassword()
mkdirSync(dir, { recursive: true })
writeFileSync(file, `site: ${site}/correspondent/login\nemail: ${email}\npassword: ${password}\ncity: ${city}\ncreated: ${new Date().toISOString()}\n`, { mode: 0o600 })
console.log(`create-correspondent: database ${databaseEndpoint(database)}, site ${site}`)
try {
  execFileSync(process.execPath, ['node_modules/payload/bin.js', 'run', 'src/scripts/create-correspondent.ts'], {
    env: {
      ...process.env,
      ...vars,
      DATABASE_URL: database,
      NEW_CORRESPONDENT_EMAIL: email,
      NEW_CORRESPONDENT_NAME: name,
      NEW_CORRESPONDENT_CITY: city,
      NEW_CORRESPONDENT_PASSWORD: password,
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  })
} catch (err) {
  rmSync(file, { force: true })
  throw new Error('account not created; the password file was removed', { cause: err })
}
console.log(`create-correspondent: password saved to ${file} (not printed). Send it privately, then delete the file.`)
