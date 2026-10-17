import { request } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { E2E, E2E_BASE_URL } from './env'

export const AUTH_FILE = 'test-results/e2e-auth.json'

/**
 * Logs each test account in once and shares the JWTs with every worker. Parallel logins of the
 * same account race on Payload's per-user session list and can silently invalidate a token
 * (the request then runs as a visitor).
 */
export default async function globalSetup() {
  const ctx = await request.newContext({ baseURL: E2E_BASE_URL })
  const tokens: Record<string, string> = {}
  for (const [name, who] of Object.entries({ admin: E2E.admin, damascus: E2E.damascus })) {
    const res = await ctx.post('/api/users/login', { data: who })
    if (!res.ok()) throw new Error(`e2e login failed for ${who.email}: ${res.status()}`)
    tokens[name] = ((await res.json()) as { token: string }).token
  }
  mkdirSync(dirname(AUTH_FILE), { recursive: true })
  writeFileSync(AUTH_FILE, JSON.stringify(tokens))
  await ctx.dispose()
}
