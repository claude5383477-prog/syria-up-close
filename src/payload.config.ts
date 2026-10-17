import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ar } from '@payloadcms/translations/languages/ar'
import { en } from '@payloadcms/translations/languages/en'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { Users } from './collections/Users'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const secret = process.env.PAYLOAD_SECRET
if (!secret && process.env.NODE_ENV === 'production') throw new Error('PAYLOAD_SECRET is required in production')

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SITE_URL,
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
  collections: [Users],
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  graphQL: { disable: true },
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
