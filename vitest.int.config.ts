import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Integration tests: Payload Local API against a real PostgreSQL started by tests/int/globalSetup.ts.
export default defineConfig({
  resolve: {
    alias: {
      '@payload-config': fileURLToPath(new URL('./src/payload.config.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/int/**/*.int.test.ts'],
    globalSetup: ['tests/int/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
    coverage: {
      provider: 'v8',
      include: ['src/access/**', 'src/hooks/**', 'src/lib/**', 'src/collections/**', 'src/endpoints/**'],
    },
  },
})
