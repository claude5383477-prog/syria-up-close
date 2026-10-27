// e2e only (scripts/e2e-server.mjs), after `npm run seed`: re-applies the content migrations that fill
// countryside pages from rows the seed creates (the countryside trips, their slugs and spots).
//
// On a fresh database `payload migrate` runs before the seed, when there are no cities or trips yet, so
// these fill-only migrations match nothing and are recorded as done. Production ran them on existing
// rows. Running them again here, in their original order, gives the throwaway e2e database the same
// countryside content (e.g. Mari's ruins). Never run this on the deployed database.
import config from '@payload-config'
import { getPayload } from 'payload'
import { up as moreDayTrips } from '@/migrations/20261023_210000_more_day_trips'
import { up as ruralContent } from '@/migrations/20261026_080000_rural_content'
import { fillCountryside } from '@/migrations/20261027_000000_fill_content'

type Run = Parameters<typeof ruralContent>[0]

const payload = await getPayload({ config })
try {
  if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) throw new Error('e2e-content runs only on a local database')
  const run = { db: (payload.db as unknown as { drizzle: Run['db'] }).drizzle } as Run
  // Their original order: the trips, then their pages (slugs), then the countryside content. City hotels
  // (the rest of fill_content, and ministry_stays) are left out: the city-page tests describe the seed's
  // own hotels.
  await moreDayTrips(run)
  await ruralContent(run)
  await fillCountryside(run.db)
  payload.logger.info('e2e content migrations re-applied.')
  process.exit(0)
} catch (err) {
  payload.logger.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
