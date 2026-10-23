import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ar } from '@payloadcms/translations/languages/ar'
import { en } from '@payloadcms/translations/languages/en'
import { s3Storage } from '@payloadcms/storage-s3'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { AuditLog } from './collections/AuditLog'
import { Cities } from './collections/Cities'
import { DailyDetail } from './collections/DailyDetail'
import { DayTrips } from './collections/DayTrips'
import { FirstVisitPages } from './collections/FirstVisitPages'
import { Media } from './collections/Media'
import { Places } from './collections/Places'
import { SeasonReports } from './collections/SeasonReports'
import { StatusItems } from './collections/StatusItems'
import { Stays } from './collections/Stays'
import { Stories } from './collections/Stories'
import { Users } from './collections/Users'
import { Venues } from './collections/Venues'
import { CityLore } from './collections/CityLore'
import { CityPhotos } from './collections/CityPhotos'
import { SiteSettings } from './globals/SiteSettings'
import { withAudit } from './hooks/audit'
import { withMediaApproval } from './hooks/approveMedia'
import { siteOrigins, siteUrl } from './lib/site-url'
import { blobStorage, mediaStorage } from './lib/storage'
import { MAX_UPLOAD_BYTES } from './lib/upload-limits'
import { revalidateSiteEndpoint, withRevalidate } from './hooks/revalidate'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const secret = process.env.PAYLOAD_SECRET
if (!secret && process.env.NODE_ENV === 'production') throw new Error('PAYLOAD_SECRET is required in production')

export default buildConfig({
  serverURL: siteUrl(),
  // Cookie auth is only honoured for requests from our own origin(s) (CSRF); no other cross-origin API access.
  csrf: siteOrigins(),
  cors: siteOrigins(),
  secret: secret ?? 'dev-only-insecure-secret',
  admin: {
    user: Users.slug,
    importMap: { baseDir: dirname },
    meta: { titleSuffix: ' · سوريا عن قرب' },
  },
  // Admin UI in Arabic (SPEC §2); English kept as a fallback for untranslated strings.
  i18n: { supportedLanguages: { ar, en }, fallbackLanguage: 'ar' },
  localization: {
    locales: [
      { code: 'ar', label: 'العربية', rtl: true },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'ar',
    fallback: true,
  },
  collections: [
    Users, Cities, Places, DayTrips, StatusItems, FirstVisitPages, SeasonReports,
    Stories, DailyDetail, Stays, Venues, CityLore, CityPhotos, Media, AuditLog,
  ]
    .map(withAudit)
    .map(withRevalidate)
    .map(withMediaApproval),
  globals: [SiteSettings],
  endpoints: [revalidateSiteEndpoint],
  plugins: [
    // Vercel Blob in production, S3/R2 if configured instead, local disk otherwise (lib/storage).
    vercelBlobStorage(blobStorage()),
    s3Storage(mediaStorage()),
  ],
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
      // Vercel: many short-lived instances share Neon's pooler, so each keeps few connections and
      // releases idle ones quickly (before the instance is suspended).
      ...(process.env.VERCEL ? { max: 5, idleTimeoutMillis: 5_000 } : {}),
    },
    // Schema changes go through committed migrations everywhere (dev, tests, prod): npm run migrate:create.
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  graphQL: { disable: true },
  // REST multipart uploads stop at the same cap as hooks/approveMedia checkUploadSize (G2).
  upload: { limits: { fileSize: MAX_UPLOAD_BYTES } },
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
