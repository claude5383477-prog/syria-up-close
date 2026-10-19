/**
 * Upload size cap for every photo (staff and correspondents), enforced on the server (hooks/approveMedia
 * checkUploadSize). Below Vercel's 4.5MB function request limit, above what the correspondent page
 * produces (it compresses to about 600KB, at most 3MB).
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
