import { describe, expect, it } from 'vitest'
import { isPreviewDeployment, siteOrigins, siteUrl } from '@/lib/site-url'

describe('siteUrl', () => {
  it('is NEXT_PUBLIC_SITE_URL without a trailing slash (production, Docker, local)', () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: 'https://syria.example.org/' })).toBe('https://syria.example.org')
  })

  it('is the deployment’s own address on a Vercel Preview, never the production domain', () => {
    const env = { VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'syria-git-feat-x.vercel.app', VERCEL_URL: 'syria-abc123.vercel.app', NEXT_PUBLIC_SITE_URL: 'https://syria.example.org' }
    expect(siteUrl(env)).toBe('https://syria-git-feat-x.vercel.app')
    expect(siteUrl({ VERCEL_ENV: 'preview', VERCEL_URL: 'syria-abc123.vercel.app' })).toBe('https://syria-abc123.vercel.app')
  })

  it('falls back to localhost', () => {
    expect(siteUrl({})).toBe('http://localhost:3000')
  })
})

describe('siteOrigins (Payload csrf/cors)', () => {
  it('is the one site origin outside Vercel', () => {
    expect(siteOrigins({ NEXT_PUBLIC_SITE_URL: 'https://syria.example.org' })).toEqual(['https://syria.example.org'])
  })

  it('accepts both the branch and the per-deployment address on a Preview', () => {
    const env = { VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'syria-git-x.vercel.app', VERCEL_URL: 'syria-abc.vercel.app' }
    expect(siteOrigins(env)).toEqual(['https://syria-git-x.vercel.app', 'https://syria-abc.vercel.app'])
  })

  it('in production also accepts the deployment’s own vercel.app address', () => {
    const env = { VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://syria.example.org', VERCEL_URL: 'syria-abc.vercel.app' }
    expect(siteOrigins(env)).toEqual(['https://syria.example.org', 'https://syria-abc.vercel.app'])
  })
})

describe('isPreviewDeployment', () => {
  it('only for VERCEL_ENV=preview', () => {
    expect(isPreviewDeployment({ VERCEL_ENV: 'preview' })).toBe(true)
    expect(isPreviewDeployment({ VERCEL_ENV: 'production' })).toBe(false)
    expect(isPreviewDeployment({})).toBe(false)
  })
})
