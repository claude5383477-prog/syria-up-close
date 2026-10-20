import { LockedAuth, type CollectionAfterErrorHook } from 'payload'

/**
 * Users afterError (REST and the admin sign-in): a locked account answers exactly like a wrong
 * email or password. Payload's "this user is locked" told anyone who has an account, since only an
 * existing address can be locked. The lock itself still applies (5 tries, 15 minutes).
 */
export const hideLockedAccount: CollectionAfterErrorHook = ({ error, req }) => {
  if (!(error instanceof LockedAuth)) return
  return { response: { errors: [{ message: req.t('error:emailOrPasswordIncorrect') }] }, status: 401 }
}
