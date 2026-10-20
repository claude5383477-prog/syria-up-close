import { APIError, type CollectionBeforeChangeHook } from 'payload'

/** Lexical nodes that point at another document: a photo (upload) or any record (relationship). */
const EMBEDDED = new Set(['upload', 'relationship'])

type Node = { type?: unknown; children?: unknown }

function hasEmbedded(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false
  const n = node as Node
  if (typeof n.type === 'string' && EMBEDDED.has(n.type)) return true
  return Array.isArray(n.children) && n.children.some(hasEmbedded)
}

/**
 * beforeChange (drafts included, which skip validation): the rich-text field carries text only.
 * G1: a photo inside the text escaped the attachable-media rule (another correspondent's private
 * photo) and was never approved on publish. Photos go in the report's photos field instead.
 */
export const textOnlyRichText =
  (field: string): CollectionBeforeChangeHook =>
  ({ data }) => {
    const value = (data as Record<string, unknown> | undefined)?.[field] as { root?: unknown } | null | undefined
    if (value && hasEmbedded(value.root)) {
      throw new APIError('النص لا يحمل صوراً ولا روابط لمستندات. أضف الصور في حقل الصور.', 400, [{ path: field, message: 'embedded document' }], true)
    }
    return data
  }
