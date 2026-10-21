/**
 * Plain text with light Markdown (## / ### headings, - and 1. lists, > quotes, **bold**) as a Lexical
 * value with text nodes only, so it passes hooks/textOnlyRichText. Used by the starter content seed.
 */
type Node = Record<string, unknown>
type ListNode = Node & { listType: string; children: Node[] }

const text = (t: string, bold = false): Node => ({ type: 'text', text: t, format: bold ? 1 : 0, detail: 0, mode: 'normal', style: '', version: 1 })
const block = (type: string, children: Node[], extra: Node = {}): Node => ({ type, children, direction: null, format: '', indent: 0, version: 1, ...extra })

/** "a **b** c" → three text nodes, the middle one bold. */
export function inline(s: string): Node[] {
  return s
    .split(/\*\*(.+?)\*\*/)
    .map((part, i) => (part ? text(part, i % 2 === 1) : null))
    .filter((n): n is Node => n !== null)
}

export function markdownToLexical(md: string): { root: Node } {
  const children: Node[] = []
  let list: ListNode | null = null
  for (const raw of md.split('\n')) {
    const line = raw.trim()
    const item = /^(?:[-*]|(\d+)\.)\s+(.*)$/.exec(line)
    if (item) {
      const listType = item[1] ? 'number' : 'bullet'
      if (list?.listType !== listType) {
        list = block('list', [], { listType, start: 1, tag: listType === 'number' ? 'ol' : 'ul' }) as ListNode
        children.push(list)
      }
      list.children.push(block('listitem', inline(item[2] ?? ''), { value: list.children.length + 1 }))
      continue
    }
    list = null
    if (!line) continue
    const heading = /^(#{2,3})\s+(.*)$/.exec(line)
    if (heading) children.push(block('heading', inline(heading[2] ?? ''), { tag: `h${heading[1]!.length}` }))
    else if (line.startsWith('>')) children.push(block('quote', inline(line.replace(/^>\s*/, ''))))
    else children.push(block('paragraph', inline(line), { textFormat: 0, textStyle: '' }))
  }
  return { root: block('root', children) }
}
