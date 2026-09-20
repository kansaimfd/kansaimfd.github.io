/**
 * 確認日の鮮度を見る。**古い情報は誤りより気づきにくい。**
 *
 *   node scripts/audit-freshness.mjs             # 人が読む形で出す
 *   node scripts/audit-freshness.mjs --json      # 機械が読む形で出す（月次ワークフローが使う）
 *   node scripts/audit-freshness.mjs --months 18 # 期限を変える（既定は12か月）
 *
 * リンク検査（audit-urls.mjs）が見つけるのは「開かなくなったURL」で、
 * **開くけれど中身が変わった**施設は見つからない。休館・移転・貸館の終了・
 * 料金改定は告知なく起きるので、確認から間が空いた施設は「正しく見えるが
 * 実際とは違う」状態になりうる。ここはその一覧を出すだけで、外部アクセスはしない。
 *
 * 選び出しそのものは coverage.mjs の staleRecords が持つ（単体でテストできるように）。
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as yaml from 'js-yaml'
import { staleRecords } from './coverage.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const load = file => yaml.load(readFileSync(resolve(root, `data/facilities/${file}.yaml`), 'utf-8'))

const monthsArg = process.argv.indexOf('--months')
const months = monthsArg >= 0 ? Number(process.argv[monthsArg + 1]) : 12

const datasets = [
  { file: 'concerthall', records: load('concerthall') },
  { file: 'practice', records: load('practice') },
]
const { stale, missing, total, 期限 } = staleRecords(datasets, { months })

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ stale, missing, total, months, 期限 }, null, 2))
} else {
  const show = (label, arr) => {
    console.log(`\n=== ${label}（${arr.length}件）===`)
    for (const r of arr) {
      console.log(`  [${r.file} ID:${r.ID}] ${r.施設名}${r.確認日 ? ` 確認日 ${r.確認日}` : ''}`)
      if (r.URL) console.log(`    ${r.URL}`)
    }
  }
  show(`${months}か月より前の確認（${期限} より古い）`, stale)
  show('出典なし', missing)
  console.log(
    `\n確認済み ${total - stale.length - missing.length}件 / 要再確認 ${stale.length}件 / 出典なし ${missing.length}件（全${total}件）`,
  )
}
