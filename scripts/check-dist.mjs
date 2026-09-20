/**
 * ビルドの成果物（dist/）を、実際に配ってみて検品する。
 *
 * **デプロイは CI の完了を待たない**（`deploy.yml` は push で独立に走る）ので、
 * 検品を通っていない dist もそのまま配信される。成果物を実際に配ってみる経路は
 * ここだけなので、毎回のビルドでやる。見ているのは3つ。
 *
 * 1. **URLごとの静的HTML**。SPA なので、配信側が拡張子を省いたURLに .html を
 *    当ててくれないと `/concert/10` は届かない（一覧は同名のディレクトリと並ぶので
 *    `concert.html` と `concert/index.html` の両方を書いている）。題名・canonical・
 *    本文（noscript）まで見て、全ページが同じ index.html に戻っていないことを確かめる。
 * 2. **入口の大きさ**。入口チャンクは一覧の静的 import を剥がして小さくしたもので、
 *    静的 import が1本増えれば黙って戻る。数字で止める（上限は `ENTRY_BUDGET`）。
 * 3. **説明文が名乗る府県**。載っている施設の府県と食い違えば止める（6府県を名乗りながら
 *    和歌山県の施設が1件も無い、という状態が続いていた）。
 *
 * **ここは読み書きと段取りだけを持つ。判断は dist-check.mjs にある**
 * （validate.mjs / build-data.mjs と同じ分け方。門番そのものをテストできるように）。
 *
 * 使い方: node scripts/check-dist.mjs（npm run check とCIが呼ぶ）
 */
import { createServer } from 'net'
import { spawn } from 'child_process'
import { gzipSync } from 'zlib'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { buildPages, DESCRIBED_PREFS, SITE_DESCRIPTION } from './static-pages.mjs'
import {
  checkDescribedPrefs,
  checkEntrySize,
  checkIndexDescription,
  checkNotFound,
  checkPage,
  checkSitemap,
  entryAssetPaths,
} from './dist-check.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const dataDir = resolve(root, 'src/data')

/**
 * 入口（index.html が直接読む js と css）の上限。gzip 後のバイト数。
 *
 * 現状は js 約81KB + css 約5KB。**一覧のJSONを静的に import すると約20KB増える**ので、
 * そこへ戻る前に止まる余裕にしてある。意図して増やすときは、何が増えたのかを
 * コミットメッセージに書いたうえでこの数字を上げる。
 *
 * 86KB から上げたのは React 19.3 で、**プロジェクト側の退行ではなく React 自体が太った**
 * （react-dom の unpacked が 7.32MB → 8.06MB）。入口は 78.3KB から 86.7KB になった。
 */
const ENTRY_BUDGET = 90 * 1024

const errors = []
const fail = msgs => errors.push(...msgs)

/* ── 1. 入口の大きさ ─────────────────────────────────────── */

const indexHtml = readFileSync(join(dist, 'index.html'), 'utf-8')
const entryAssets = entryAssetPaths(indexHtml).map(path => ({
  path,
  bytes: gzipSync(readFileSync(join(dist, path)), { level: 9 }).length,
}))
const entryBytes = entryAssets.reduce((sum, a) => sum + a.bytes, 0)
fail(checkEntrySize(entryAssets, ENTRY_BUDGET))

/* ── 2. URLごとの静的HTML ────────────────────────────────── */

const readDir = kind =>
  readdirSync(join(dataDir, kind))
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(dataDir, kind, f), 'utf-8')))
    .sort((a, b) => a.ID - b.ID)

const concert = readDir('concert')
const practice = readDir('practice')
const pages = buildPages({ concert, practice })

fail(
  checkDescribedPrefs(
    [...concert, ...practice].map(f => f.都道府県),
    DESCRIBED_PREFS,
  ),
)
fail(checkIndexDescription(indexHtml, SITE_DESCRIPTION))
fail(
  checkNotFound(
    existsSync(join(dist, '404.html')) ? readFileSync(join(dist, '404.html'), 'utf-8') : '',
  ),
)

const freePort = () =>
  new Promise((ok, ng) => {
    const s = createServer()
    s.on('error', ng)
    s.listen(0, () => {
      const { port } = s.address()
      s.close(() => ok(port))
    })
  })

const port = await freePort()
// **npx 経由で起動しない。** kill が届くのは npx までで、その下の vite が生き残り、
// npm run check のたびにサーバーが積み上がる。vite を直接の子にして確実に止める
const preview = spawn(
  process.execPath,
  [resolve(root, 'node_modules/vite/bin/vite.js'), 'preview'],
  {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  },
)

const base = `http://localhost:${port}`
const sleep = ms => new Promise(r => setTimeout(r, ms))

try {
  // 立ち上がるまで待つ
  let up = false
  for (let i = 0; i < 60 && !up; i++) {
    try {
      up = (await fetch(base + '/')).ok
    } catch {
      await sleep(250)
    }
  }
  if (!up) throw new Error(`vite preview が ${base} で立ち上がりませんでした`)

  for (const page of pages) {
    const res = await fetch(base + page.path)
    fail(checkPage(page, res.status, res.status === 200 ? await res.text() : ''))
  }

  const sitemap = await fetch(base + '/sitemap.xml')
  fail(
    checkSitemap(
      sitemap.ok ? await sitemap.text() : '',
      pages.filter(p => p.sitemap !== false).length,
    ),
  )
} finally {
  preview.kill()
}

if (errors.length > 0) {
  console.error(`\n✖ dist の検品で ${errors.length}件`)
  for (const e of errors) console.error(`  ${e}`)
  process.exit(1)
}

console.log(
  `dist OK: ${pages.length} URLs が 200 / 入口 gzip ${(entryBytes / 1024).toFixed(1)}KB ` +
    `（上限 ${(ENTRY_BUDGET / 1024).toFixed(1)}KB）`,
)
