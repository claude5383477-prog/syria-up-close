import { APIError, type CollectionBeforeOperationHook } from 'payload'

/**
 * Users beforeOperation. Accounts get a random password from the admin (npm run correspondent:create).
 * - Only the admin sets a password: anyone else (or a stolen session) could otherwise replace a
 *   32-character password with "123456", which the 5-try lock does not protect for long.
 * - Forgot-password is off: with no email service it only wrote the address to the server logs,
 *   and only for addresses that have an account. The admin resets passwords.
 */
export const passwordRules: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  // Reset too: a token issued before forgot-password was turned off must not set a password.
  if (operation === 'forgotPassword' || operation === 'resetPassword') throw new APIError('إعادة تعيين كلمة السر تتم عبر المدير.', 403)
  const { data, overrideAccess } = args as { data?: { password?: unknown }; overrideAccess?: boolean }
  if (operation === 'update' && !overrideAccess && data?.password && (req.user as { role?: string } | null)?.role !== 'admin') {
    throw new APIError('كلمة السر يغيّرها المدير فقط.', 403)
  }
  return args
}
