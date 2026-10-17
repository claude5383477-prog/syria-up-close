import { describe, expect, it } from 'vitest'
import { stampCreator } from '@/hooks/stampCreator'

const hook = stampCreator('uploadedBy')
const run = (args: { operation: 'create' | 'update'; data: Record<string, unknown>; user?: { id: number } | null; originalDoc?: Record<string, unknown> }) =>
  hook({ ...args, req: { user: args.user ?? null } } as never)

describe('stampCreator', () => {
  it('records the signed-in user on create, ignoring what the client sent', () => {
    expect(run({ operation: 'create', data: { uploadedBy: 99, alt: 'x' }, user: { id: 3 } })).toEqual({ uploadedBy: 3, alt: 'x' })
  })

  it('leaves the field empty on create without a user (seed / system jobs)', () => {
    expect(run({ operation: 'create', data: { uploadedBy: 99 } })).toEqual({ uploadedBy: undefined })
  })

  it('keeps the original creator on update, ignoring what the client sent', () => {
    expect(run({ operation: 'update', data: { uploadedBy: 99 }, user: { id: 3 }, originalDoc: { uploadedBy: 7 } })).toEqual({ uploadedBy: 7 })
    expect(run({ operation: 'update', data: { uploadedBy: 99 }, user: { id: 3 }, originalDoc: { uploadedBy: { id: 7 } } })).toEqual({ uploadedBy: 7 })
  })
})

describe('stampCreator with a public name field', () => {
  const named = stampCreator('author', 'authorName')
  const run = (args: { operation: 'create' | 'update'; data: Record<string, unknown>; user?: { id: number; name?: string } | null; originalDoc?: Record<string, unknown> }) =>
    named({ ...args, req: { user: args.user ?? null } } as never)

  it('stores the creator name on create and keeps the original on update', () => {
    expect(run({ operation: 'create', data: { authorName: 'Fake' }, user: { id: 3, name: 'مراسل' } })).toEqual({ author: 3, authorName: 'مراسل' })
    expect(run({ operation: 'update', data: { authorName: 'Fake' }, user: { id: 9, name: 'محرر' }, originalDoc: { author: 3, authorName: 'مراسل' } })).toEqual({ author: 3, authorName: 'مراسل' })
    expect(run({ operation: 'create', data: {} })).toEqual({ author: undefined, authorName: null })
  })
})
