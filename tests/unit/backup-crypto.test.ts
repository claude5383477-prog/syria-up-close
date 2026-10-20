import { beforeAll, describe, expect, it } from 'vitest'
import { decryptBackup, encryptBackup, isLocal } from '@/lib/backup-crypto'

// Backups hold every row (password hashes, real names, emails): they are written encrypted only.

const secret = 'correct horse battery staple, long enough'
const plaintext = Buffer.from(JSON.stringify({ users: [{ name: 'الاسم الحقيقي', email: 'real@example.org' }] }))

describe('backup encryption (gpg, AES-256)', () => {
  // gpg derives the key from the passphrase on purpose slowly, and the first call starts gpg-agent;
  // under a parallel test run that overran the 5 s per-test budget when every test encrypted
  // again. One ciphertext, made here, serves every check below.
  let encrypted: Buffer
  beforeAll(async () => {
    encrypted = await encryptBackup(plaintext, secret)
  })

  it('round-trips, and the ciphertext reveals nothing of the content', async () => {
    expect(encrypted.includes(Buffer.from('real@example.org'))).toBe(false)
    expect(encrypted.includes(Buffer.from('الاسم الحقيقي'))).toBe(false)
    expect((await decryptBackup(encrypted, secret)).equals(plaintext)).toBe(true)
  })

  it('a wrong passphrase is refused', async () => {
    await expect(decryptBackup(encrypted, 'wrong passphrase, also long enough')).rejects.toThrow()
  })

  it('refuses a short passphrase', async () => {
    await expect(encryptBackup(plaintext, 'short')).rejects.toThrow(/passphrase/)
  })
})

describe('isLocal (restore target guard)', () => {
  it('accepts plain local URLs', () => {
    expect(isLocal('postgres://u:p@localhost:5432/db')).toBe(true)
    expect(isLocal('postgres://u:p@127.0.0.1:54336/drill')).toBe(true)
  })

  it('refuses remote hosts and a ?host= that points elsewhere (pg honours it)', () => {
    expect(isLocal('postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb')).toBe(false)
    expect(isLocal('postgres://u:p@localhost:5432/db?host=ep-x.neon.tech')).toBe(false)
    expect(isLocal('postgres://u:p@localhost:5432/db?sslmode=require&hostaddr=10.0.0.5')).toBe(false)
    expect(isLocal('postgres://u:p@localhost.evil.example:5432/db')).toBe(false)
  })
})
