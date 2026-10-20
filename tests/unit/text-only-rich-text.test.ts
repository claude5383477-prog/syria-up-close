import { describe, expect, it } from 'vitest'
import { textOnlyRichText } from '@/hooks/textOnlyRichText'

const hook = textOnlyRichText('body')
const run = (body: unknown) => hook({ data: { title: 't', body } } as never)
const root = (...children: unknown[]) => ({ root: { type: 'root', children } })

describe('textOnlyRichText (beforeChange)', () => {
  it('refuses a photo or a document link at any depth', () => {
    expect(() => run(root({ type: 'upload', value: 1 }))).toThrow()
    expect(() => run(root({ type: 'list', children: [{ type: 'listitem', children: [{ type: 'relationship', value: 2 }] }] }))).toThrow()
  })

  it('refuses an internal link, a block and any unknown node type', () => {
    expect(() => run(root({ type: 'paragraph', children: [{ type: 'link', fields: { linkType: 'internal', doc: { value: 1 } } }] }))).toThrow()
    expect(() => run(root({ type: 'block', fields: { photo: 1 } }))).toThrow()
    expect(() => run(root({ type: 'something-new' }))).toThrow()
    expect(() => run(root({ children: [] }))).toThrow()
  })

  it('accepts a link to a URL', () => {
    const body = root({ type: 'paragraph', children: [{ type: 'link', fields: { linkType: 'custom', url: 'https://example.org' }, children: [{ type: 'text', text: 'x' }] }] })
    expect(run(body)).toEqual({ title: 't', body })
  })

  it('accepts text, and an empty or missing body', () => {
    const text = root({ type: 'paragraph', children: [{ type: 'text', text: 'x' }] })
    expect(run(text)).toEqual({ title: 't', body: text })
    expect(run(null)).toEqual({ title: 't', body: null })
    expect(hook({ data: { title: 't' } } as never)).toEqual({ title: 't' })
  })
})
