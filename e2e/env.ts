// Fixed values for the throwaway e2e environment started by scripts/e2e-server.mjs.
// Test-only accounts on a temporary local database that is deleted after the run.
export const E2E = {
  port: Number(process.env.E2E_PORT ?? 3100),
  pgPort: 54331,
  pgPassword: 'syria-e2e',
  db: 'syria_e2e',
  admin: { email: 'admin@e2e.test', password: 'e2e-admin-password' },
  damascus: { email: 'damascus@e2e.test', password: 'e2e-damascus-password' },
  // Created by global-setup for the correspondent UI tests (their own sessions).
  uiOneCity: { name: 'مراسلة دمشق', email: 'ui-damascus@e2e.test', password: 'ui-damascus-password', cities: ['damascus'] },
  uiTwoCities: { name: 'مراسل الساحل', email: 'ui-coast@e2e.test', password: 'ui-coast-password', cities: ['latakia', 'bloudan'] },
} as const

/** Mirrors INDEXNOW_KEY in scripts/e2e-server.mjs. */
export const E2E_INDEXNOW_KEY = 'e2e0indexnow0key0000000000000000'

export const E2E_DATABASE_URL = `postgres://syria:${E2E.pgPassword}@localhost:${E2E.pgPort}/${E2E.db}`
export const E2E_BASE_URL = `http://localhost:${E2E.port}`
