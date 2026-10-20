import { APIError, type CollectionBeforeChangeHook } from 'payload'

/**
 * Lexical node types a text-only field may hold: text and its structure. Anything else (a photo,
 * a relationship, a block, an unknown type) can carry a reference to another document.
 */
const TEXT_NODES = new Set(['root', 'paragraph', 'text', 'heading', 'list', 'listitem', 'quote', 'linebreak', 'tab', 'horizontalrule', 'link', 'autolink'])

type Node = { type?: unknown; children?: unknown; fields?: { linkType?: unknown } | null }

function isTextOnly(node: unknown): boolean {
  if (!node || typeof node !== 'object') return true
  const n = node as Node
  if (typeof n.type !== 'string' || !TEXT_NODES.has(n.type)) return false
  // A link to a URL is text; an internal link points at a document.
  if ((n.type === 'link' || n.type === 'autolink') && n.fields?.linkType === 'internal') return false
  return !Array.isArray(n.children) || n.children.every(isTextOnly)
}

/**
 * beforeChange (drafts included, which skip validation): the rich-text field carries text only.
 * G1: a photo, block or internal link inside the text escaped the attachable-media rule (another
 * correspondent's private photo) and was never approved on publish. Photos go in the report's
 * photos field instead. An allowlist, so a node type added later is refused until reviewed.
 */
export const textOnlyRichText =
  (field: string): CollectionBeforeChangeHook =>
  ({ data }) => {
    const value = (data as Record<string, unknown> | undefined)?.[field] as { root?: unknown } | null | undefined
    if (value && !isTextOnly(value.root)) {
      throw new APIError('النص لا يحمل صوراً ولا روابط لمستندات. أضف الصور في حقل الصور.', 400, [{ path: field, message: 'embedded document' }], true)
    }
    return data
  }
