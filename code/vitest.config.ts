import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@ankanu/kernel': fileURLToPath(new URL('./packages/kernel/src/index.ts', import.meta.url)),
      '@ankanu/ports': fileURLToPath(new URL('./packages/ports/src/index.ts', import.meta.url)),
    },
  },
  test: {
    setupFiles: ['./apps/api/src/test-recaptcha.ts'],
    include: ['packages/*/src/**/*.test.ts', 'apps/api/src/**/*.test.ts', 'apps/web/src/**/*.test.ts', 'apps/web/src/**/*.test.tsx'],
    fileParallelism: false,
  },
})
