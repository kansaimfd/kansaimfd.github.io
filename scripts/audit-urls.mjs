/**
 * 登録URLの生死と乗っ取りを検査する（外部アクセスするのでビルドには組み込まない）。
 *
 *   node scripts/audit-urls.mjs
 *
 * SAYAKAホールの sayaka-hall.jp が失効後に無関係なWordPressサイトへ
 * 転用されていた（旅行系スパム）ことを受けて追加した。
 * DNS切れ・404 だけでなく、**開くが別サイト**という状態を見つけるのが目的。
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sleep = ms => new Promise(r => setTimeout(r, ms))

/** 施設名から、タイトルに出てきそうな手掛かりを切り出す */
function nameHints(name) {
  const base = name.replace(/[（(].*?[)）]/g, ' ')
  return base
    .split(/[\s　・]+/)
    .flatMap(w => (w.length >= 3 ? [w, w.replace(/(市立|町立|府立|県立|市民|市)/g, '')] : []))
    .map(w => w.trim())
    .filter(w => w.length >= 3)
}

const rows = []
for (const file of ['concerthall', 'practice']) {
  const list = yaml.load(readFileSync(resolve(root, `data/facilities/${file}.yaml`), 'utf8'))
  for (const f of list) if (f.URL) rows.push({ file, ID: f.ID, 施設名: f.施設名, URL: f.URL, 出典: !!(f.出典 && f.出典.length) })
}

const dead = [], suspect = [], ok = []
for (const r of rows) {
  let res, body = ''
  try {
    res = await fetch(r.URL, { redirect: 'follow', signal: AbortSignal.timeout(20000) })
    body = (await res.text()).slice(0, 20000)
  } catch (e) {
    dead.push({ ...r, why: e.cause?.code || e.name || String(e).slice(0, 60) })
    await sleep(150); continue
  }
  if (!res.ok) { dead.push({ ...r, why: `HTTP ${res.status}` }); await sleep(150); continue }
  const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 80)
  const hints = nameHints(r.施設名)
  const hit = hints.some(h => title.includes(h) || body.includes(h))
  const enUS = /inLanguage":"en-US"|lang="en-US"/.test(body)
  if (!hit) suspect.push({ ...r, title, why: enUS ? '施設名が出てこない＋en-US' : '施設名が出てこない' })
  else ok.push(r)
  await sleep(150)
}

const show = (label, arr) => {
  console.log(`\n=== ${label}（${arr.length}件）===`)
  for (const r of arr) {
    console.log(`  [${r.file} ID:${r.ID}] ${r.施設名}${r.出典 ? '' : ' ※出典なし'}`)
    console.log(`    ${r.URL}`)
    console.log(`    ${r.why}${r.title ? ` / title: ${r.title}` : ''}`)
  }
}
show('到達不可', dead)
show('要確認（施設名がページに出てこない）', suspect)
console.log(`\n正常 ${ok.length}件 / 到達不可 ${dead.length}件 / 要確認 ${suspect.length}件（全${rows.length}件）`)
