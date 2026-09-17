import { defineConfig } from 'vitest/config'

// vite.config.ts とは別に置いている。大半のテストは純粋関数が対象で、
// Tailwind のプラグインも DOM も要らないため。
//
// 既定は node のまま。DOM が要るのはルーティングのスモークテストだけなので、
// そのファイルの先頭で `// @vitest-environment jsdom` を宣言させる
// （全テストを jsdom で動かすと、純粋関数のテストまで遅くなる）。
export default defineConfig({
  // JSX は Vite（oxc）の既定の変換で通るので、React プラグインは足していない
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      // テストから読み込まれなかったファイルも 0% として数える。
      // 「測っていない範囲」が数字から消えると、カバレッジは実態より良く見える
      include: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs'],
      exclude: [
        '**/*.test.{ts,tsx,mjs}',
        // ビルド生成物と、実行コードを持たない型定義
        'src/data/**',
        'src/types.ts',
      ],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
    },
  },
})
