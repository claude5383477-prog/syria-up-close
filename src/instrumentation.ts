// Runs once when a server instance starts (Next.js instrumentation).
export async function register() {
  // Vercel only: there Next serves in minimal mode and loads each page module on its first request.
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.VERCEL) return
  const { preloadPublicPages } = await import('./lib/preload-pages')
  void preloadPublicPages()
}
