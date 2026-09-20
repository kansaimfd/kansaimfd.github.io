/**
 * ビルドの成果物（dist/）を、実際に配ってみて検品する。
 *
 * **デプロイを止めているあいだ、ここが唯一の実物の確認経路になる。**
 * CLAUDE.md は「再開したら /concert と /concert/10 が 200 で返ることを実物で
 * 確かめること」を宿題にしていたが、確かめるのは preview を立てて叩くだけなので
 * 毎回のビルドでやる。見ているのは2つ。
 *
 * 1. **URLごとの静的HTML**。SPA なので、配信側が拡張子を省いたURLに .html を
 *    当ててくれないと `/concert/10` は届かない（一覧は同名のディレクトリと並ぶので
 *    `concert.html` と `concert/index.html` の両方を書いている）。題名・canonical・
 *    本文（noscript）まで見て、全ページが同じ index.html に戻っていないことを確かめる。
 * 2. **入口の大きさ**。入口チャンクは一覧の静的 import を剥がして gzip 95.9KB → 75.0KB に
 *    下げたもので、静的 import が1本増えれば黙って戻る。数字で止める。
 *
 * 使い方: node scripts/check-dist.mjs（npm run check とCIが呼ぶ）
 */
import { createServer } from 'net'
import { spawn } from 'child_process'
import { gzipSync } from 'zlib'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { buildPages, pageTitle, SITE_URL } from './static-pages.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const dataDir = resolve(root, 'src/data')

/**
 * 入口（index.html が直接読む js と css）の上限。gzip 後のバイト数。
 *
 * 現状は js 約74KB + css 約6KB。**一覧のJSONを静的に import すると約20KB増える**ので、
 * そこへ戻る前に止まる余裕にしてある。意図して増やすときは、何が増えたのかを
 * コミットメッセージに書いたうえでこの数字を上げる。
 */
const ENTRY_BUDGET = 86 * 1024

const errors = []
const fail = msg => errors.push(msg)

/* ── 1. 入口の大きさ ─────────────────────────────────────── */

const indexHtml = readFileSync(join(dist, 'index.html'), 'utf-8')
const entryAssets = [...indexHtml.matchAll(/(?:src|href)="\/(assets\/[^"]+)"/g)].map(m => m[1])
if (entryAssets.length === 0) fail('dist/index.html が assets を1つも読んでいません')

let entryBytes = 0
const sizes = entryAssets.map(asset => {
  const bytes = gzipSync(readFileSync(join(dist, asset)), { level: 9 }).length
  entryBytes += bytes
  return `${asset} ${(bytes / 1024).toFixed(1)}KB`
})
if (entryBytes > ENTRY_BUDGET) {
  fail(
    `入口が大きくなっています: gzip ${(entryBytes / 1024).toFixed(1)}KB ` +
      `> 上限 ${(ENTRY_BUDGET / 1024).toFixed(1)}KB（${sizes.join(' / ')}）\n` +
      `    静的 import が増えていないか確かめてください（一覧も詳細も遅延読み込みです）`,
  )
}

/* ── 2. URLごとの静的HTML ────────────────────────────────── */

const readDir = kind =>
  readdirSync(join(dataDir, kind))
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(dataDir, kind, f), 'utf-8')))
    .sort((a, b) => a.ID - b.ID)

const pages = buildPages({ concert: readDir('concert'), practice: readDir('practice') })

/** 404.html は配信側が返すものなので preview では出てこない。ファイルとして確かめる */
const notFound = existsSync(join(dist, '404.html'))
  ? readFileSync(join(dist, '404.html'), 'utf-8')
  : ''
if (!notFound) fail('dist/404.html がありません')
else {
  if (!/<meta name="robots" content="noindex"/.test(notFound)) {
    fail('404.html に noindex がありません（無いページが検索結果に出ます）')
  }
  if (/rel="canonical"/.test(notFound)) {
    fail('404.html に canonical があります（無いページがトップの複製に見えます）')
  }
}

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
const preview = spawn('npx', ['vite', 'preview'], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
})

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

  const titleOf = html => html.match(/<title>([^<]*)<\/title>/)?.[1]
  const canonicalOf = html => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]

  for (const page of pages) {
    const res = await fetch(base + page.path)
    if (res.status !== 200) {
      fail(`${page.path} が ${res.status} で返りました（静的HTMLが届いていません）`)
      continue
    }
    const html = await res.text()
    const expected = pageTitle(page.name)
    if (titleOf(html) !== expected) {
      fail(`${page.path} の題名が違います: ${titleOf(html)} ≠ ${expected}`)
    }
    const canonical = SITE_URL + (page.canonical ?? page.path)
    if (canonicalOf(html) !== canonical) {
      fail(`${page.path} の canonical が違います: ${canonicalOf(html)} ≠ ${canonical}`)
    }
    // 施設ページは noscript に施設名が出る（JS を実行しない相手に見える唯一の本文）
    if (page.fallback && !html.includes(`<h1>${page.fallback.heading}</h1>`)) {
      fail(`${page.path} の noscript に施設名がありません`)
    }
  }

  // sitemap も配られていること（robots.txt が指している先）
  const sitemap = await fetch(base + '/sitemap.xml')
  const xml = sitemap.ok ? await sitemap.text() : ''
  const listed = [...xml.matchAll(/<loc>/g)].length
  const expected = pages.filter(p => p.sitemap !== false).length
  if (listed !== expected) fail(`sitemap.xml の件数が違います: ${listed} ≠ ${expected}`)
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
