import { describe, expect, it } from 'vitest'
import { changedFields } from '@/lib/audit'

describe('changedFields', () => {
  it('lists top-level fields whose value changed, ignoring timestamps and ids', () => {
    expect(
      changedFields(
        { id: 1, value: 'a', sourceUrl: null, updatedAt: '1', createdAt: '0' },
        { id: 1, value: 'b', sourceUrl: null, updatedAt: '2', createdAt: '0' },
      ),
    ).toEqual(['value'])
  })

  it('compares nested values structurally', () => {
    expect(changedFields({ sizes: { a: 1 } }, { sizes: { a: 1 } })).toEqual([])
    expect(changedFields({ sizes: { a: 1 } }, { sizes: { a: 2 } })).toEqual(['sizes'])
  })

  it('treats a created document as all its fields', () => {
    expect(changedFields(undefined, { id: 1, name: 'x', role: 'editor' }).sort()).toEqual(['name', 'role'])
  })

  it('never exposes credential internals, only that the password changed', () => {
    expect(changedFields({ hash: 'a', salt: 's', name: 'x' }, { hash: 'b', salt: 't', name: 'x' })).toEqual(['password'])
    expect(changedFields({ loginAttempts: 0, lockUntil: null }, { loginAttempts: 1, lockUntil: 'x' })).toEqual([])
  })

  it('treats null and undefined as the same', () => {
    expect(changedFields({ a: null }, { a: undefined })).toEqual([])
    expect(changedFields({}, { a: null })).toEqual([])
  })
})
