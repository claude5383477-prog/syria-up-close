import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Backups hold every row (password hashes, real names, emails), so they are only ever written
 * encrypted: gpg symmetric AES-256. The data goes through stdin/stdout, so no plaintext file is
 * written. The passphrase is never on the command line: gpg reads it from a private temporary file
 * (mode 0600, deleted at once; Windows gpg cannot read an extra file descriptor). It already lives on
 * disk in the git-ignored .env.backup.local. gpg comes with Git for Windows; GPG overrides the path.
 */

const gpgPath = () =>
  process.env.GPG ?? (process.platform === 'win32' && existsSync('C:/Program Files/Git/usr/bin/gpg.exe') ? 'C:/Program Files/Git/usr/bin/gpg.exe' : 'gpg')

function gpg(args: string[], input: Buffer, passphrase: string): Promise<Buffer> {
  if (passphrase.length < 20) return Promise.reject(new Error('backup passphrase must be at least 20 characters'))
  const dir = mkdtempSync(join(tmpdir(), 'suc-gpg-'))
  const keyFile = join(dir, 'k')
  writeFileSync(keyFile, passphrase, { mode: 0o600 })
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(gpgPath(), ['--batch', '--yes', '--quiet', '--no-symkey-cache', '--pinentry-mode', 'loopback', '--passphrase-file', keyFile, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const out: Buffer[] = []
    const err: Buffer[] = []
    child.stdout.on('data', (d: Buffer) => out.push(d))
    child.stderr.on('data', (d: Buffer) => err.push(d))
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`gpg failed (${code}): ${Buffer.concat(err).toString().trim().slice(0, 200)}`)),
    )
    child.stdin.end(input)
  }).finally(() => rmSync(dir, { recursive: true, force: true }))
}

export const encryptBackup = (data: Buffer, passphrase: string) => gpg(['--symmetric', '--cipher-algo', 'AES256', '--output', '-'], data, passphrase)

export const decryptBackup = (data: Buffer, passphrase: string) => gpg(['--decrypt', '--output', '-'], data, passphrase)

/** A restore target on this machine only: localhost / 127.0.0.1 / ::1, and no host override in the query. */
export function isLocal(connectionString: string): boolean {
  let url: URL
  try {
    url = new URL(connectionString)
  } catch {
    return false
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return false
  // node-postgres honours ?host= / ?hostaddr=, which would send the connection elsewhere.
  return !url.searchParams.has('host') && !url.searchParams.has('hostaddr')
}
