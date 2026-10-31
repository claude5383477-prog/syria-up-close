// Where a visit came from (SEO day 5): an AI assistant, a search engine, another site, or nowhere
// (typed, bookmarked, or a referrer the browser or app withheld). Pure, so it is unit-tested; the
// analytics tool sends one "ai_referral" event with the engine and the page, nothing about the visitor.
//
// Hosts are the ones these assistants link from (ChatGPT also tags its links utm_source=chatgpt.com).
// Analytics vendors report that ChatGPT sometimes sends neither, so part of its traffic lands under
// "direct": this undercounts, it never overcounts.

export type AiEngine = 'chatgpt' | 'perplexity' | 'copilot' | 'gemini' | 'claude' | 'deepseek' | 'meta-ai'
export type VisitSource = { kind: 'ai'; engine: AiEngine } | { kind: 'search' | 'direct' | 'internal' | 'other' }

const AI_HOSTS: [RegExp, AiEngine][] = [
  [/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/, 'chatgpt'],
  [/(^|\.)perplexity\.ai$/, 'perplexity'],
  [/^copilot\.microsoft\.com$|^copilot\.cloud\.microsoft$/, 'copilot'],
  [/^gemini\.google\.com$|^bard\.google\.com$/, 'gemini'],
  [/(^|\.)claude\.ai$/, 'claude'],
  [/(^|\.)deepseek\.com$/, 'deepseek'],
  [/(^|\.)meta\.ai$/, 'meta-ai'],
]

// utm_source values the assistants (or people sharing their answers) put on links.
const AI_UTM: [RegExp, AiEngine][] = [
  [/^(chatgpt(\.com)?|openai)$/, 'chatgpt'],
  [/^perplexity(\.ai)?$/, 'perplexity'],
  [/^copilot(\.microsoft\.com)?$/, 'copilot'],
  [/^gemini(\.google\.com)?$/, 'gemini'],
  [/^claude(\.ai)?$/, 'claude'],
]

const SEARCH_HOST = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yandex\.[a-z.]+|search\.yahoo\.com|ecosia\.org|search\.brave\.com|baidu\.com|qwant\.com)$/

function host(u: string): string | null {
  try {
    return new URL(u).hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Classifies a visit from document.referrer and the page's utm_source. A utm_source naming an assistant
 * wins (the link was tagged on purpose); then the referrer host; an empty or unreadable referrer is direct.
 * Gemini's host is checked before the search engines, since google.com would otherwise claim it.
 */
export function visitSource(referrer: string | null | undefined, utmSource: string | null | undefined, ownHost?: string): VisitSource {
  const utm = utmSource?.trim().toLowerCase()
  if (utm) for (const [re, engine] of AI_UTM) if (re.test(utm)) return { kind: 'ai', engine }
  const h = referrer ? host(referrer) : null
  if (!h) return { kind: 'direct' }
  if (ownHost && h === ownHost.toLowerCase()) return { kind: 'internal' }
  for (const [re, engine] of AI_HOSTS) if (re.test(h)) return { kind: 'ai', engine }
  if (SEARCH_HOST.test(h)) return { kind: 'search' }
  return { kind: 'other' }
}
