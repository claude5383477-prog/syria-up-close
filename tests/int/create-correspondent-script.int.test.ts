import { execFile } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// scripts/create-correspondent.mjs handles a real password: it must never print it, and must not
// leave it on disk when the account was not created.

const run = (args: string[]) =>
  new Promise<{ code: number | null; out: string }>((resolve) => {
    execFile(process.execPath, ['scripts/create-correspondent.mjs', ...args], { timeout: 120_000 }, (err, stdout, stderr) =>
      resolve({ code: err ? ((err as { code?: number }).code ?? 1) : 0, out: `${stdout}\n${stderr}` }),
    )
  })

describe('npm run correspondent:create', () => {
  it('when creation fails, the password file is removed and no password-like value is printed', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'suc-create-'))
    const env = join(dir, '.env.test')
    // A database nobody listens on: the account cannot be created.
    writeFileSync(env, 'DATABASE_URL=postgres://u:p@127.0.0.1:1/none\nPAYLOAD_SECRET=test-secret-for-the-script-only\n')
    const file = join('accounts', 'localhost-script-test-desk@example.org.txt')
    try {
      const { code, out } = await run(['--env', env, '--email', 'script-test-desk@example.org', '--name', 'Hidden Person', '--city', 'damascus'])
      expect(code).not.toBe(0)
      expect(out).toMatch(/account not created/)
      expect(existsSync(file)).toBe(false)
      // The password is 32 URL-safe characters; nothing of that shape may reach the terminal.
      expect(out).not.toMatch(/(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{32}(?![A-Za-z0-9_-])/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
      rmSync(file, { force: true })
    }
  })

  it('refuses an address that carries the real name before writing anything', async () => {
    const { code, out } = await run(['--email', 'khalil@example.org', '--name', 'Ahmad Khalil', '--city', 'damascus'])
    expect(code).not.toBe(0)
    expect(out).toMatch(/refused/)
    expect(existsSync(join('accounts', 'localhost-khalil@example.org.txt'))).toBe(false)
  })
})
