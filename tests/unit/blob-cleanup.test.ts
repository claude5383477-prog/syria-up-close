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
  it('deletes the original, every size and everything else left in its own key folder', async () => {
    const client = fakeClient(['0f3e/test-1.png', '0f3e/test-1-400x300.webp', '0f3e/test-1-800x600.webp', '0f3e/test-1-1600x1200.webp', 'other/keep.webp'])
    await deleteMediaFiles({ ...folderDoc, _objectKey: '0f3e' }, client, { folderShared: false })
    expect(new Set(client.deleted)).toEqual(
      new Set(['0f3e/test-1.png', '0f3e/test-1-400x300.webp', '0f3e/test-1-800x600.webp', '0f3e/test-1-1600x1200.webp'].map((p) => `${HOST}/${p}`)),
    )
    expect(client.list).toHaveBeenCalledWith(expect.objectContaining({ prefix: '0f3e/' }))
  })

  it('a root-level photo: deletes its files and never lists the whole store', async () => {
    const client = fakeClient(['7c1d-uuid.webp', '7c1d-uuid-400x300.webp', 'someone-else.webp'])
    await deleteMediaFiles(rootDoc, client, { folderShared: false })
    expect(client.deleted).toEqual([`${HOST}/7c1d-uuid.webp`, `${HOST}/7c1d-uuid-400x300.webp`])
    expect(client.list).not.toHaveBeenCalled()
  })

  it('does nothing for a document without Blob files', async () => {
    const client = fakeClient([])
    await deleteMediaFiles({ url: '/api/media/file/a.webp' }, client, { folderShared: false })
    expect(client.del).not.toHaveBeenCalled()
  })
})

describe('deleteMediaFiles never sweeps a folder that is not the photo’s own (security H1)', () => {
  it('no _objectKey (server upload under a collection prefix such as preview/): exact files only', async () => {
    const client = fakeClient(['preview/a.webp', 'preview/a-400x300.webp', 'preview/other-photo.webp'])
    const doc = { url: `${HOST}/preview/a.webp`, sizes: { thumb: { url: `${HOST}/preview/a-400x300.webp` } } }
    await deleteMediaFiles(doc, client, { folderShared: false })
    expect(client.deleted).toEqual([`${HOST}/preview/a.webp`, `${HOST}/preview/a-400x300.webp`])
    expect(client.list).not.toHaveBeenCalled()
  })

  it('a folder that does not end with the photo’s own key is never swept (a forged prefix)', async () => {
    const client = fakeClient(['victimkey/v.png', 'victimkey/v-400x300.webp'])
    const forged = { url: `${HOST}/victimkey/x.webp`, _objectKey: 'mykey' }
    await deleteMediaFiles(forged, client, { folderShared: false })
    expect(client.list).not.toHaveBeenCalled()
    expect(client.deleted).toEqual([`${HOST}/victimkey/x.webp`])
  })

  it('a key folder another photo also uses is never swept', async () => {
    const client = fakeClient(['0f3e/test-1.png', '0f3e/other.png'])
    await deleteMediaFiles({ ...folderDoc, _objectKey: '0f3e' }, client, { folderShared: true })
    expect(client.list).not.toHaveBeenCalled()
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
