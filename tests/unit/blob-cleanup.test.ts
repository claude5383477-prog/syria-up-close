import { describe, expect, it, vi } from 'vitest'
import { blobPathsOf, deleteMediaFiles, findOrphans, type BlobClient } from '@/lib/blob-cleanup'

const HOST = 'https://abc123.public.blob.vercel-storage.com'

// A client-uploaded photo lives in a random folder with its three sizes.
const folderDoc = {
  url: `${HOST}/0f3e/test-1.png`,
  sizes: {
    thumb: { url: `${HOST}/0f3e/test-1-400x300.webp` },
    card: { url: `${HOST}/0f3e/test-1-800x600.webp` },
    hero: { url: null },
  },
}
// A correspondent photo (server upload) sits at the store root.
const rootDoc = { url: `${HOST}/7c1d-uuid.webp`, sizes: { thumb: { url: `${HOST}/7c1d-uuid-400x300.webp` } } }

function fakeClient(stored: string[]): BlobClient & { deleted: string[] } {
  const deleted: string[] = []
  return {
    deleted,
    del: vi.fn(async (urls: string[]) => void deleted.push(...urls)),
    list: vi.fn(async ({ prefix }: { prefix: string }) => ({
      blobs: stored.filter((p) => p.startsWith(prefix)).map((pathname) => ({ pathname, url: `${HOST}/${pathname}`, uploadedAt: new Date(0) })),
      hasMore: false,
    })),
  }
}

describe('blobPathsOf', () => {
  it('collects the original and every size that has a Blob URL', () => {
    expect(blobPathsOf(folderDoc)).toEqual(['0f3e/test-1.png', '0f3e/test-1-400x300.webp', '0f3e/test-1-800x600.webp'])
  })

  it('ignores local (/api/media/file) and foreign URLs', () => {
    expect(blobPathsOf({ url: '/api/media/file/a.webp', sizes: { thumb: { url: 'https://example.org/x.webp' } } })).toEqual([])
  })
})

describe('deleteMediaFiles (media afterDelete)', () => {
  it('deletes the original, every size and everything else left in its folder', async () => {
    const client = fakeClient(['0f3e/test-1.png', '0f3e/test-1-400x300.webp', '0f3e/test-1-800x600.webp', '0f3e/test-1-1600x1200.webp', 'other/keep.webp'])
    await deleteMediaFiles(folderDoc, client)
    expect(new Set(client.deleted)).toEqual(
      new Set(['0f3e/test-1.png', '0f3e/test-1-400x300.webp', '0f3e/test-1-800x600.webp', '0f3e/test-1-1600x1200.webp'].map((p) => `${HOST}/${p}`)),
    )
    expect(client.list).toHaveBeenCalledWith(expect.objectContaining({ prefix: '0f3e/' }))
  })

  it('a root-level photo: deletes its files and never lists the whole store', async () => {
    const client = fakeClient(['7c1d-uuid.webp', '7c1d-uuid-400x300.webp', 'someone-else.webp'])
    await deleteMediaFiles(rootDoc, client)
    expect(client.deleted).toEqual([`${HOST}/7c1d-uuid.webp`, `${HOST}/7c1d-uuid-400x300.webp`])
    expect(client.list).not.toHaveBeenCalled()
  })

  it('does nothing for a document without Blob files', async () => {
    const client = fakeClient([])
    await deleteMediaFiles({ url: '/api/media/file/a.webp' }, client)
    expect(client.del).not.toHaveBeenCalled()
  })
})

describe('findOrphans', () => {
  const now = new Date('2026-10-19T12:00:00Z')
  const blob = (pathname: string, minutesAgo: number) => ({ pathname, url: `${HOST}/${pathname}`, uploadedAt: new Date(now.getTime() - minutesAgo * 60_000) })

  it('lists files no media document references, older than the grace period', () => {
    const blobs = [blob('a/kept.png', 120), blob('b/orphan.png', 120), blob('c/uploading.png', 2)]
    expect(findOrphans(blobs, new Set(['a/kept.png']), now).map((b) => b.pathname)).toEqual(['b/orphan.png'])
  })
})
