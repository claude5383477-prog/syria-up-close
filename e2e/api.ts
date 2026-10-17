import type { APIRequestContext } from '@playwright/test'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { AUTH_FILE } from './global-setup'
import { E2E, E2E_DATABASE_URL } from './env'

type Account = { email: string; password: string }

/**
 * JWT header for a test account, logged in once by e2e/global-setup.ts (no cookies, so CSRF origin
 * checks don't apply).
 */
export function login(who: Account): Record<string, string> {
  const tokens = JSON.parse(readFileSync(AUTH_FILE, 'utf8')) as Record<string, string>
  const name = who.email === E2E.admin.email ? 'admin' : 'damascus'
  return { Authorization: `JWT ${tokens[name]}` }
}

export async function cityId(request: APIRequestContext, slug: string): Promise<number> {
  const res = await request.get(`/api/cities?where[slug][equals]=${slug}&depth=0`)
  const { docs } = (await res.json()) as { docs: { id: number }[] }
  if (!docs[0]) throw new Error(`no city ${slug}`)
  return docs[0].id
}

/** Direct SQL for what no API allows on purpose (e.g. backdating a server-stamped verifiedAt). */
export async function sql(query: string, params: unknown[] = []): Promise<void> {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL })
  await client.connect()
  try {
    await client.query(query, params)
  } finally {
    await client.end()
  }
}

export const accounts = { admin: E2E.admin, damascus: E2E.damascus }
