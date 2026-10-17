// Fixed values for the throwaway e2e environment started by scripts/e2e-server.mjs.
// Test-only accounts on a temporary local database that is deleted after the run.
export const E2E = {
  port: Number(process.env.E2E_PORT ?? 3100),
  pgPort: 54331,
  pgPassword: 'syria-e2e',
  db: 'syria_e2e',
  admin: { email: 'admin@e2e.test', password: 'e2e-admin-password' },
  damascus: { email: 'damascus@e2e.test', password: 'e2e-damascus-password' },
} as const

export const E2E_DATABASE_URL = `postgres://syria:${E2E.pgPassword}@localhost:${E2E.pgPort}/${E2E.db}`
export const E2E_BASE_URL = `http://localhost:${E2E.port}`
