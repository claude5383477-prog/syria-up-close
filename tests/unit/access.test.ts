import { describe, expect, it } from 'vitest'
import {
  adminOnly,
  adminOnlyField,
  assignedCityIds,
  authenticated,
  cityScoped,
  cityScopedCreate,
  editorOrAdmin,
  ownOrStaff,
  selfOrAdmin,
  selfOrStaff,
  type AppUser,
} from '@/access'

const admin: AppUser = { id: 1, role: 'admin' }
const editor: AppUser = { id: 2, role: 'editor' }
const damascus: AppUser = { id: 3, role: 'correspondent', assignedCities: [10, { id: 11 }] }
const unassigned: AppUser = { id: 4, role: 'correspondent', assignedCities: [] }
const roleless: AppUser = { id: 5, role: null }

// Payload passes { req: { user }, data, ... }; tests only need those parts.
const as = (user: AppUser | null, data?: Record<string, unknown>) => ({ req: { user }, data }) as never

describe('assignedCityIds', () => {
  it('normalises populated and unpopulated relations', () => {
    expect(assignedCityIds(damascus)).toEqual([10, 11])
    expect(assignedCityIds(unassigned)).toEqual([])
    expect(assignedCityIds({ id: 9, role: 'correspondent' })).toEqual([])
  })
})

describe('authenticated', () => {
  it('requires any signed-in user', () => {
    expect(authenticated(as(null))).toBe(false)
    expect(authenticated(as(damascus))).toBe(true)
  })
})

describe('adminOnly / editorOrAdmin', () => {
  it('adminOnly admits only admins', () => {
    expect(adminOnly(as(admin))).toBe(true)
    for (const u of [editor, damascus, roleless, null]) expect(adminOnly(as(u))).toBe(false)
  })

  it('editorOrAdmin admits editors and admins', () => {
    expect(editorOrAdmin(as(admin))).toBe(true)
    expect(editorOrAdmin(as(editor))).toBe(true)
    for (const u of [damascus, roleless, null]) expect(editorOrAdmin(as(u))).toBe(false)
  })

  it('adminOnlyField guards role and assignedCities', () => {
    expect(adminOnlyField(as(admin))).toBe(true)
    expect(adminOnlyField(as(editor))).toBe(false)
    expect(adminOnlyField(as(damascus))).toBe(false)
  })
})

describe('selfOrAdmin / selfOrStaff (users collection)', () => {
  it('admins see everyone; others only themselves', () => {
    expect(selfOrAdmin(as(admin))).toBe(true)
    expect(selfOrAdmin(as(editor))).toEqual({ id: { equals: 2 } })
    expect(selfOrAdmin(as(damascus))).toEqual({ id: { equals: 3 } })
    expect(selfOrAdmin(as(null))).toBe(false)
  })

  it('staff (admin, editor) see everyone; correspondents only themselves', () => {
    expect(selfOrStaff(as(admin))).toBe(true)
    expect(selfOrStaff(as(editor))).toBe(true)
    expect(selfOrStaff(as(damascus))).toEqual({ id: { equals: 3 } })
    expect(selfOrStaff(as(null))).toBe(false)
  })
})

describe('cityScoped (read/update/delete filter)', () => {
  const scoped = cityScoped('city')

  it('staff are unrestricted', () => {
    expect(scoped(as(admin))).toBe(true)
    expect(scoped(as(editor))).toBe(true)
  })

  it('correspondents are limited to their assigned cities', () => {
    expect(scoped(as(damascus))).toEqual({ city: { in: [10, 11] } })
  })

  it('a correspondent with no cities, a roleless user or a visitor gets nothing', () => {
    expect(scoped(as(unassigned))).toBe(false)
    expect(scoped(as(roleless))).toBe(false)
    expect(scoped(as(null))).toBe(false)
  })

  it('uses the given field name', () => {
    expect(cityScoped('fromCity')(as(damascus))).toEqual({ fromCity: { in: [10, 11] } })
  })
})

describe('cityScopedCreate (create checks the incoming data)', () => {
  const create = cityScopedCreate('city')

  it('staff may create for any city', () => {
    expect(create(as(admin, { city: 99 }))).toBe(true)
    expect(create(as(editor, { city: 99 }))).toBe(true)
  })

  it('a correspondent may create only for an assigned city (id or populated object)', () => {
    expect(create(as(damascus, { city: 10 }))).toBe(true)
    expect(create(as(damascus, { city: { id: 11 } }))).toBe(true)
    expect(create(as(damascus, { city: 12 }))).toBe(false)
  })

  it('rejects a missing city, string-vs-number mismatches aside', () => {
    expect(create(as(damascus, {}))).toBe(false)
    expect(create(as(damascus))).toBe(false)
    expect(create(as(damascus, { city: '10' }))).toBe(true)
  })

  it('rejects visitors and roleless users', () => {
    expect(create(as(null, { city: 10 }))).toBe(false)
    expect(create(as(roleless, { city: 10 }))).toBe(false)
  })
})

describe('ownOrStaff (documents a correspondent created)', () => {
  const own = ownOrStaff('uploadedBy')

  it('staff are unrestricted, correspondents only their own', () => {
    expect(own(as(admin))).toBe(true)
    expect(own(as(editor))).toBe(true)
    expect(own(as(damascus))).toEqual({ uploadedBy: { equals: 3 } })
    expect(own(as(null))).toBe(false)
    expect(own(as(roleless))).toBe(false)
  })
})
