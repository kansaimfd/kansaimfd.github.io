/**
 * vite build の後に、URLごとの静的HTMLと sitemap.xml を dist/ へ書き出す。
 * 組み立ての規則は static-pages.mjs にある（→ そちらの冒頭）。
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  buildPages,
  renderPage,
  renderNotFound,
  buildSitemap,
  outputFiles,
} from './static-pages.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const dataDir = resolve(root, 'src/data')

const readDir = kind =>
  readdirSync(join(dataDir, kind))
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(dataDir, kind, f), 'utf-8')))
    .sort((a, b) => a.ID - b.ID)

const template = readFileSync(join(dist, 'index.html'), 'utf-8')
const pages = buildPages({ concert: readDir('concert'), practice: readDir('practice') })

// 404.html は index.html を書き換える前の形から作る（canonical がトップを指さないように）
writeFileSync(join(dist, '404.html'), renderNotFound(template), 'utf-8')

let files = 0
for (const page of pages) {
  const html = renderPage(template, page)
  for (const file of outputFiles(page.path)) {
    const out = join(dist, file)
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, html, 'utf-8')
    files++
  }
}
writeFileSync(join(dist, 'sitemap.xml'), buildSitemap(pages), 'utf-8')

console.log(`Static pages: ${pages.length} URLs → ${files} files + 404.html + sitemap.xml`)
