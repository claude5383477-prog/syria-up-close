/**
 * Stored name for an uploaded photo: a random UUID instead of the phone's file name, so the public
 * storage URL of a not-yet-published photo cannot be guessed (IMG_0001.jpg) and never collides with
 * another photo's files. Web Crypto, so this module stays usable in the browser too.
 */
export function storedPhotoName(original: string): string {
  const ext = /\.([a-z0-9]{1,5})$/i.exec(original)?.[1]?.toLowerCase() ?? 'webp'
  return `${globalThis.crypto.randomUUID()}.${ext}`
}
