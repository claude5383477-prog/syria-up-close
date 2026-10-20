import { APIError, type CollectionBeforeOperationHook } from 'payload'

/**
 * Users beforeOperation. Accounts get a random password from the admin (npm run correspondent:create).
 * - Only the admin sets a password: anyone else (or a stolen session) could otherwise replace a
 *   32-character password with "123456", which the 5-try lock does not protect for long.
 */
export const passwordRules: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  const { data, overrideAccess } = args as { data?: { password?: unknown }; overrideAccess?: boolean }
  if (operation === 'update' && !overrideAccess && data?.password && (req.user as { role?: string } | null)?.role !== 'admin') {
    throw new APIError('كلمة السر يغيّرها المدير فقط.', 403)
  }
  return args
}
