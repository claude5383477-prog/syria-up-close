import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/access/**', 'src/hooks/**'],
      thresholds: {
        lines: 90,
        'src/lib/freshness.ts': { lines: 100, branches: 100, functions: 100, statements: 100 },
      },
    },
  },
})
