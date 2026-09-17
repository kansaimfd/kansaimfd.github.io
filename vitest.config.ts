import { defineConfig } from 'vitest/config'

// vite.config.ts とは別に置いている。テストは純粋関数だけを対象にしていて
// React / Tailwind のプラグインも DOM も要らないため。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
})
