// Entry point for `npm run seed` (payload run). Reads accounts from the environment / .env.
import config from '@payload-config'
import { getPayload } from 'payload'
import { seed } from './seed'

const payload = await getPayload({ config })
try {
  const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_CORRESPONDENT_EMAIL, SEED_CORRESPONDENT_PASSWORD } = process.env
  await seed(payload, { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_CORRESPONDENT_EMAIL, SEED_CORRESPONDENT_PASSWORD })
  payload.logger.info('Seed complete.')
  process.exit(0)
} catch (err) {
  payload.logger.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
