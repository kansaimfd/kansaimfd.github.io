import { defineConfig, devices } from '@playwright/test'

/**
 * 本番ビルドの成果物（`dist/`）を、実際のブラウザで開いて確かめる。
 *
 * **これまで「出来た dist が動く」ことは誰も見ていなかった。**
 * `check-dist.mjs` は全URLが200で返ることと `<head>`・noscript・入口の大きさを見るが、
 * 中身（`<div id="root">`）をアプリが描けるかは見ない。ルーティングのスモークテスト
 * （`src/App.test.tsx`）は jsdom の上でソースを読むので、**本番ビルドでしか出ない
 * 壊れ方**——動的 import の解決、地図ワーカーのURL、CSSの読み込み順——は素通りする。
 *
 * 見るのは導線だけで、見た目は対象にしない（`src/App.test.tsx` と同じ線引き）。
 *
 * 使い方: `npm run build` のあとに `npm run test:e2e`（`npm run check` の最後で回る）。
 * ブラウザが入っていなければ `npx playwright install chromium` が要る。
 */
export default defineConfig({
  testDir: './e2e',
  // 施設ページを1つ開くだけでも動的 import が2往復するので、既定より少し長めに取る
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // 落ちたときに何が起きたのかが分かるように、失敗したときだけ痕跡を残す
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // 確かめたいのは「配った成果物が動くか」なので、ブラウザは1つでよい
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // dist を実際に配る。`npm run build` を済ませてから呼ぶこと
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
})
