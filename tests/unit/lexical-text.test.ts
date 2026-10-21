import { describe, expect, it } from 'vitest'
import { inline, markdownToLexical } from '@/lib/lexical-text'

const types = (nodes: unknown) => (nodes as { type: string }[]).map((n) => n.type)

describe('markdownToLexical', () => {
  it('builds headings, paragraphs, quotes and lists', () => {
    const { root } = markdownToLexical('## H2\n### H3\n\nPara\n> Quote\n- a\n- b\n1. one\n2. two\nEnd')
    const kids = root.children as { type: string; tag?: string; listType?: string; children: unknown[] }[]
    expect(types(kids)).toEqual(['heading', 'heading', 'paragraph', 'quote', 'list', 'list', 'paragraph'])
    expect(kids[0]!.tag).toBe('h2')
    expect(kids[1]!.tag).toBe('h3')
    expect(kids[4]!.listType).toBe('bullet')
    expect(kids[4]!.children).toHaveLength(2)
    expect(kids[5]!.listType).toBe('number')
    expect((kids[5]!.children[1] as { value: number }).value).toBe(2)
  })

  it('marks **bold** text and drops empty parts', () => {
    expect(inline('**a** b')).toEqual([
      expect.objectContaining({ text: 'a', format: 1 }),
      expect.objectContaining({ text: ' b', format: 0 }),
    ])
  })

  it('returns an empty root for empty input', () => {
    expect(markdownToLexical('\n\n').root.children).toEqual([])
  })
})
