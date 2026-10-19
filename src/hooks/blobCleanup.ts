import { del, list } from '@vercel/blob'
import type { CollectionAfterDeleteHook, Endpoint, PayloadRequest } from 'payload'
import { blobPathsOf, deleteMediaFiles, findOrphans, listAll, type BlobClient } from '@/lib/blob-cleanup'
import { storageBackend } from '@/lib/storage'

// Wires lib/blob-cleanup to Vercel Blob for the media collection. See that file for the why.

function blobClient(): BlobClient | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (storageBackend() !== 'vercel-blob' || !token) return null
  return {
    del: (urls) => del(urls, { token }),
    list: async ({ prefix, cursor }) => {
      const res = await list({ prefix, cursor, limit: 1000, token })
      return { blobs: res.blobs, hasMore: res.hasMore, cursor: res.cursor }
    },
  }
}

/**
 * Media afterDelete: delete the photo's files on Blob. Runs inside the delete's transaction, so if
 * Blob refuses, the delete fails and can be retried rather than leaving a public file behind.
 */
export const deleteBlobFilesAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  const client = blobClient()
  if (client) await deleteMediaFiles(doc, client)
  return doc
}

async function orphanReport(req: PayloadRequest, client: BlobClient, remove: boolean) {
  const all = await listAll(client, '')
  const { docs } = await req.payload.find({ collection: 'media', overrideAccess: true, pagination: false, depth: 0 })
  const referenced = new Set(docs.flatMap((d) => blobPathsOf(d as Parameters<typeof blobPathsOf>[0])))
  const orphans = findOrphans(all, referenced)
  if (remove && orphans.length) await client.del(orphans.map((b) => b.url))
  return { total: all.length, referenced: referenced.size, orphans: orphans.length, deleted: remove ? orphans.length : 0 }
}

const handler = (remove: boolean): Endpoint['handler'] => async (req) => {
  if ((req.user as { role?: string } | null)?.role !== 'admin') return Response.json({ message: 'Forbidden' }, { status: 403 })
  const client = blobClient()
  if (!client) return Response.json({ message: 'Vercel Blob is not the media storage here' }, { status: 400 })
  return Response.json(await orphanReport(req, client, remove))
}

/**
 * /api/media/blob-orphans, admin only: files on Blob that no media document references (older than
 * 30 minutes). GET reports, POST deletes them. Runs where the store token lives, so nobody copies it.
 */
export const blobOrphansEndpoint: Endpoint[] = [
  { path: '/blob-orphans', method: 'get', handler: handler(false) },
  { path: '/blob-orphans', method: 'post', handler: handler(true) },
]
