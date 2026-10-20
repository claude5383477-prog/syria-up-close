// Run by scripts/create-correspondent.mjs through `payload run`; the values come from the
// environment (never the command line), and the password is never printed.
import config from '@payload-config'
import { getPayload } from 'payload'
import { createCorrespondent } from '@/data/correspondents'

const env = (k: string) => {
  const v = process.env[k]
  if (!v) throw new Error(`${k} is not set`)
  return v
}

const payload = await getPayload({ config })
const made = await createCorrespondent(payload, {
  email: env('NEW_CORRESPONDENT_EMAIL'),
  name: env('NEW_CORRESPONDENT_NAME'),
  city: env('NEW_CORRESPONDENT_CITY'),
  password: env('NEW_CORRESPONDENT_PASSWORD'),
})
console.log(`create-correspondent: account ${made.id} (${made.email}) for ${made.city}, shown publicly as "${made.displayName}"`)
process.exit(0)
