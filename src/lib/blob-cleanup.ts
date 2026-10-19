/**
 * Deleting a photo must delete its files (a deleted photo must not stay at a public URL). The Blob
 * plugin's own delete hook left the random-UUID folders of browser uploads behind in production, so
 * media deletes also go through deleteMediaFiles: the exact URLs the document points at (original and
 * every size), then anything else left in that photo's folder. findOrphans finds files no media
 * document references, for the admin-only clean-up endpoint (hooks/blobCleanup).
 */

export type StoredBlob = { pathname: string; url: string; uploadedAt: Date }

/** The two @vercel/blob calls this needs; injected so the logic is testable without the network. */
export type BlobClient = {
  del: (urls: string[]) => Promise<void>
  list: (opts: { prefix: string; cursor?: string }) => Promise<{ blobs: StoredBlob[]; hasMore: boolean; cursor?: string }>
}

type MediaFiles = { url?: string | null; _objectKey?: string | null; sizes?: Record<string, { url?: string | null } | null | undefined> | null }

const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/

/** Store pathnames (no leading slash) of the original and every size that lives on Vercel Blob. */
export function blobPathsOf(doc: MediaFiles): string[] {
  const urls = [doc.url, ...Object.values(doc.sizes ?? {}).map((s) => s?.url)]
  return urls.flatMap((u) => {
    if (!u || !/^https:\/\//.test(u)) return []
    const url = new URL(u)
    return BLOB_HOST.test(url.hostname) ? [decodeURIComponent(url.pathname.replace(/^\/+/, ''))] : []
  })
}

const hostOf = (doc: MediaFiles) => (doc.url && /^https:\/\//.test(doc.url) ? new URL(doc.url).origin : '')

async function listAll(client: BlobClient, prefix: string): Promise<StoredBlob[]> {
  const out: StoredBlob[] = []
  let cursor: string | undefined
  do {
    const page = await client.list({ prefix, cursor })
    out.push(...page.blobs)
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return out
}

/**
 * Deletes a media document's files: its own URLs, then the rest of its own key folder. Security H1:
 * a folder is swept only when it is this photo's private `_objectKey` folder (the last path segment
 * is the key; the plugin gives every browser upload a random one) and no other media document shares
 * that key. A collection prefix (preview/), a forged prefix or the store root is never swept.
 */
export async function deleteMediaFiles(doc: MediaFiles, client: BlobClient, { folderShared }: { folderShared: boolean }): Promise<void> {
  const paths = blobPathsOf(doc)
  if (!paths.length) return
  const host = hostOf(doc)
  await client.del(paths.map((p) => `${host}/${p}`))
  const key = doc._objectKey
  if (!key || folderShared) return
  const own = (p: string) => p.split('/').slice(0, -1)
  const folder = own(paths[0]!)
  if (folder.at(-1) !== key || !paths.every((p) => own(p).join('/') === folder.join('/'))) return
  const rest = await listAll(client, `${folder.join('/')}/`)
  if (rest.length) await client.del(rest.map((b) => b.url))
}

/** Files no media document references, uploaded more than `graceMs` ago (an upload in progress is spared). */
export function findOrphans(blobs: StoredBlob[], referenced: Set<string>, now = new Date(), graceMs = 30 * 60_000): StoredBlob[] {
  return blobs.filter((b) => !referenced.has(b.pathname) && now.getTime() - new Date(b.uploadedAt).getTime() > graceMs)
}

export { listAll }
