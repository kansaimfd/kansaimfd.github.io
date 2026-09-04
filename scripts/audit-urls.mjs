/**
 * 登録URLの生死と「別サイトへの転用」を検査する（外部アクセスするのでビルドには組み込まない）。
 *
 *   node scripts/audit-urls.mjs
 *
 * SAYAKAホールの sayaka-hall.jp が失効後に無関係なWordPressサイト（英語・賃貸物件紹介）へ
 * 転用されていたのを受けて追加した。DNS切れ・404 だけでなく、
 * **開くが別サイト**という、404より危険な状態を見つけるのが目的。
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SCRIPT_OR_STYLE = /<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi
const TAG = /<[^>]*>/g
const URL_IN_TEXT = /https?:\/\/[^\s"'<>]+/g

/**
 * 施設名がページに出てくるかを、2文字の連なり（bigram）の一致率で測る。
 *
 * 完全一致で見ると誤検知だらけになる。「RHY梅田」が「アール・エイチ・ワイ」、
 * 「Poco四条」が「POCO四条」のように、同じ施設でも表記が揺れるため。
 */
function nameHitRatio(name, text) {
  // 記号と空白を落として比べる。括弧を外すのは**施設名の側だけ**——
  // ページ側から外すと「平野区民センター（コミュニティプラザ平野）」のように
  // 括弧の中にこそ登録名が入っている場合に、照合相手を自分で消してしまう
  const norm = (s) => s.normalize('NFKC').toLowerCase().replace(/[\s・,.'"’”「」-]/g, '')
  const n = norm(name.replace(/[（(].*?[)）]/g, '')), t = norm(text)
  const grams = new Set()
  for (let i = 0; i + 2 <= n.length; i++) grams.add(n.slice(i, i + 2))
  if (!grams.size) return 1
  let hit = 0
  for (const g of grams) if (t.includes(g)) hit++
  return hit / grams.size
}

/** Content-Type や meta charset を見て本文をデコードする（Shift_JIS のサイトが残っている） */
async function readBody(res) {
  const buf = Buffer.from(await res.arrayBuffer())
  const hint = (res.headers.get('content-type') || '') + ' ' + buf.subarray(0, 2048).toString('latin1')
  let enc = (hint.match(/charset=["']?([\w-]+)/i)?.[1] || 'utf-8').toLowerCase()
  if (['sjis', 'x-sjis', 'windows-31j', 'ms932'].includes(enc)) enc = 'shift_jis'
  try { return new TextDecoder(enc).decode(buf) } catch { return buf.toString('utf8') }
}

const rows = []
for (const file of ['concerthall', 'practice']) {
  const list = yaml.load(readFileSync(resolve(root, `data/facilities/${file}.yaml`), 'utf8'))
  for (const f of list) if (f.URL) {
    rows.push({ file, ID: f.ID, 施設名: f.施設名, URL: f.URL, 出典: !!(f.出典 && f.出典.length) })
  }
}

const dead = [], suspect = [], ok = []
for (const r of rows) {
  let res, body
  try {
    res = await fetch(r.URL, { redirect: 'follow', signal: AbortSignal.timeout(20000) })
    body = await readBody(res)
  } catch (e) {
    dead.push({ ...r, why: e.cause?.code || e.name || String(e).slice(0, 60) })
    await sleep(150); continue
  }
  if (!res.ok) { dead.push({ ...r, why: `HTTP ${res.status}` }); await sleep(150); continue }

  const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 80)
  // 可視テキストだけで照合し、ホスト名は除く。失効ドメインを取得した転用サイトは
  // 施設名入りのホスト名（sayaka-hall.jp）をタイトルに出すので、URLごと数えると検知できない
  const host = new URL(r.URL).hostname
  const visible = (title + ' ' + body)
    .replace(SCRIPT_OR_STYLE, ' ').replace(TAG, ' ')
    .split(new RegExp(host.replace(/\./g, '\.'), 'gi')).join(' ')
    .replace(URL_IN_TEXT, ' ')
  const ratio = nameHitRatio(r.施設名, visible)
  const enUS = /inLanguage":"en-US"|<html[^>]+lang="en(-US)?"/.test(body)

  if (ratio < 0.34 || (enUS && ratio < 0.7)) {
    suspect.push({ ...r, title, why: `施設名の一致率 ${(ratio * 100).toFixed(0)}%${enUS ? '・en-US' : ''}` })
  } else ok.push(r)
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
show('別サイトの疑い', suspect)
console.log(`\n正常 ${ok.length}件 / 到達不可 ${dead.length}件 / 別サイトの疑い ${suspect.length}件（全${rows.length}件）`)
