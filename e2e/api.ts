import type { APIRequestContext } from '@playwright/test'
import pg from 'pg'
import { E2E, E2E_DATABASE_URL } from './env'

type Account = { email: string; password: string }

/** Logs in through the REST API and returns a JWT header (no cookies, so CSRF origin checks don't apply). */
export async function login(request: APIRequestContext, who: Account): Promise<Record<string, string>> {
  const res = await request.post('/api/users/login', { data: who })
  if (!res.ok()) throw new Error(`login failed for ${who.email}: ${res.status()}`)
  const { token } = (await res.json()) as { token: string }
  return { Authorization: `JWT ${token}` }
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
