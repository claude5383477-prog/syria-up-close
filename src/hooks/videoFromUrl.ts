import type { CollectionBeforeChangeHook } from 'payload'
import { parseVideoUrl } from '@/lib/video'

/** Fills platform, id and shape from the pasted link (the editor only pastes the link). */
export const videoFromUrl: CollectionBeforeChangeHook = ({ data }) => {
  const v = parseVideoUrl(data?.url)
  if (!v) return data
  return { ...data, url: String(data.url).trim(), platform: v.platform, videoId: v.id, orientation: v.orientation }
}
