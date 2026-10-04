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
    include: [
      'apps/api/src/compose.test.ts',
      'apps/api/src/substrate.test.ts',
      'apps/api/src/operator-config.migrate.test.ts',
      'apps/api/src/restore-drill.test.ts',
      'apps/api/src/object-version.test.ts',
    ],
    fileParallelism: false,
  },
})
