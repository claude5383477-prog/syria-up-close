import { describe, expect, it } from 'vitest'
import { visitSource } from '@/lib/aiReferral'

describe('visitSource', () => {
  it('names each assistant from its referrer', () => {
    const cases: [string, string][] = [
      ['https://chatgpt.com/', 'chatgpt'],
      ['https://chat.openai.com/c/1', 'chatgpt'],
      ['https://www.perplexity.ai/search/x', 'perplexity'],
      ['https://perplexity.ai/', 'perplexity'],
      ['https://copilot.microsoft.com/', 'copilot'],
      ['https://gemini.google.com/app', 'gemini'],
      ['https://claude.ai/chat/1', 'claude'],
      ['https://chat.deepseek.com/', 'deepseek'],
      ['https://www.meta.ai/', 'meta-ai'],
    ]
    for (const [ref, engine] of cases) expect(visitSource(ref, null), ref).toEqual({ kind: 'ai', engine })
  })

  it('trusts a utm_source naming an assistant, even with no referrer or another one', () => {
    expect(visitSource('', 'chatgpt.com')).toEqual({ kind: 'ai', engine: 'chatgpt' })
    expect(visitSource('https://www.google.com/', 'ChatGPT')).toEqual({ kind: 'ai', engine: 'chatgpt' })
    expect(visitSource(null, 'perplexity')).toEqual({ kind: 'ai', engine: 'perplexity' })
    expect(visitSource(null, 'copilot.microsoft.com')).toEqual({ kind: 'ai', engine: 'copilot' })
    expect(visitSource(null, 'gemini')).toEqual({ kind: 'ai', engine: 'gemini' })
    expect(visitSource(null, 'claude.ai')).toEqual({ kind: 'ai', engine: 'claude' })
  })

  it('tells search engines (Google is not Gemini), other sites, our own pages and direct visits apart', () => {
    expect(visitSource('https://www.google.com/', null)).toEqual({ kind: 'search' })
    expect(visitSource('https://www.google.com.sa/', null)).toEqual({ kind: 'search' })
    expect(visitSource('https://www.bing.com/search?q=x', null)).toEqual({ kind: 'search' })
    expect(visitSource('https://duckduckgo.com/', '')).toEqual({ kind: 'search' })
    expect(visitSource('https://ahleenbooking.com/x', 'newsletter')).toEqual({ kind: 'other' })
    expect(visitSource('https://www.upclosesyria.com/cities', null, 'www.upclosesyria.com')).toEqual({ kind: 'internal' })
    expect(visitSource('', null)).toEqual({ kind: 'direct' })
    expect(visitSource(undefined, undefined)).toEqual({ kind: 'direct' })
    expect(visitSource('not a url', null)).toEqual({ kind: 'direct' })
  })
})
