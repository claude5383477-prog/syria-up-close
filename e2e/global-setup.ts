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
  // Extra correspondents for the UI tests, created once (not per worker).
  const auth = { Authorization: `JWT ${tokens.admin}` }
  for (const who of [E2E.uiOneCity, E2E.uiTwoCities]) {
    const ids: number[] = []
    for (const slug of who.cities) {
      const res = await ctx.get(`/api/cities?where[slug][equals]=${slug}&depth=0`)
      ids.push(((await res.json()) as { docs: { id: number }[] }).docs[0]!.id)
    }
    const res = await ctx.post('/api/users', {
      headers: auth,
      data: { name: who.name, email: who.email, password: who.password, role: 'correspondent', assignedCities: ids },
    })
    if (!res.ok()) throw new Error(`could not create ${who.email}: ${await res.text()}`)
  }

  mkdirSync(dirname(AUTH_FILE), { recursive: true })
  writeFileSync(AUTH_FILE, JSON.stringify(tokens))
  await ctx.dispose()
}
