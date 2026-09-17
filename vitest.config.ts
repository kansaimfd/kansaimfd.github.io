import { defineConfig } from 'vitest/config'

// vite.config.ts とは別に置いている。テストは純粋関数だけを対象にしていて
// React / Tailwind のプラグインも DOM も要らないため。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      // テストから読み込まれなかったファイルも 0% として数える。
      // 「測っていない範囲」が数字から消えると、カバレッジは実態より良く見える
      include: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs'],
      exclude: [
        '**/*.test.{ts,mjs}',
        // ビルド生成物と、実行コードを持たない型定義
        'src/data/**',
        'src/types.ts',
      ],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
    },
  },
})
