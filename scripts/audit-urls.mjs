/**
 * 登録URLの生死と「別サイトへの転用」を検査する（外部アクセスするのでビルドには組み込まない）。
 *
 *   node scripts/audit-urls.mjs           # 人が読む形で出す
 *   node scripts/audit-urls.mjs --json    # 機械が読む形で出す（月次ワークフローが使う）
 *   node scripts/audit-urls.mjs --limit 5 # 先頭5件だけ（動作確認用）
 *
 * SAYAKAホールの sayaka-hall.jp が失効後に無関係なWordPressサイト（英語・賃貸物件紹介）へ
 * 転用されていたのを受けて追加した。DNS切れ・404 だけでなく、
 * **開くが別サイト**という、404より危険な状態を見つけるのが目的。
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import { decodeBody, judgePage } from './url-audit.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sleep = ms => new Promise(r => setTimeout(r, ms))

/** 本文の取り出し。判定そのものは url-audit.mjs（通信を持たないのでテストできる） */
async function readBody(res) {
  return decodeBody(Buffer.from(await res.arrayBuffer()), res.headers.get('content-type'))
}

const rows = []
for (const file of ['concerthall', 'practice']) {
  const list = yaml.load(readFileSync(resolve(root, `data/facilities/${file}.yaml`), 'utf8'))
  for (const f of list)
    if (f.URL) {
      rows.push({ file, ID: f.ID, 施設名: f.施設名, URL: f.URL, 出典: !!(f.出典 && f.出典.length) })
    }
}

const limitArg = process.argv.indexOf('--limit')
const targets = limitArg >= 0 ? rows.slice(0, Number(process.argv[limitArg + 1])) : rows

const dead = [],
  suspect = [],
  ok = []
for (const r of targets) {
  let res, body
  try {
    res = await fetch(r.URL, { redirect: 'follow', signal: AbortSignal.timeout(20000) })
    body = await readBody(res)
  } catch (e) {
    dead.push({ ...r, why: e.cause?.code || e.name || String(e).slice(0, 60) })
    await sleep(150)
    continue
  }
  if (!res.ok) {
    dead.push({ ...r, why: `HTTP ${res.status}` })
    await sleep(150)
    continue
  }

  const verdict = judgePage({ ...r, body })
  if (verdict.suspect) suspect.push({ ...r, title: verdict.title, why: verdict.why })
  else ok.push(r)
  await sleep(150)
}

// 月次ワークフローが Issue を組み立てるための形。人が読む出力とは混ぜない
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ dead, suspect, ok: ok.length, total: targets.length }, null, 2))
} else {
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
  console.log(
    `\n正常 ${ok.length}件 / 到達不可 ${dead.length}件 / 別サイトの疑い ${suspect.length}件（全${targets.length}件）`,
  )
}
