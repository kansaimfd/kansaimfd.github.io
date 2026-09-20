import { defineConfig } from 'vitest/config'

// vite.config.ts とは別に置いている。大半のテストは純粋関数が対象で、
// ビルド用のプラグインも DOM も要らないため。
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
      // json-summary は CLAUDE.md が「一覧はここを見る」と書いている
      // coverage-summary.json を出すために要る（無いと参照先が存在しない）
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      /**
       * **中心モジュールは4指標とも100%を保つ。**
       *
       * 全体の数字は追わない（ページとコンポーネントの数字はスモークテストが
       * 通りがかりに踏んだ結果で、上げにいくとスモークテストの目的から外れる）。
       * 代わりに、絞り込み・並び替え・変換・検査といった**中身のあるモジュールだけ**を
       * ここで固定する。CLAUDE.md に文章で書いてあっても、検査が無ければ
       * 気づかないうちに落ちていく。
       *
       * ここに載せるのは「テストで全部辿れる純粋なモジュール」に限る。
       * datasets/facility.ts を入れていないのは、import.meta.glob が施設の数だけ
       * 動的 import の関数を作るためで、100%にするには167施設を全部読むしかない。
       */
      thresholds: {
        'src/{address,availability,concerthall,filter,mapStyle,name,options,practice,query,rental,sort,station,title,toggle}.ts':
          { statements: 100, branches: 100, functions: 100, lines: 100 },
        'scripts/{coverage,static-pages,transform,validate}.mjs': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
})
