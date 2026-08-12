/**
 * 調査エージェントの出力（data/research/<batch>/<file>-<ID>.yaml）を
 * data/facilities/*.yaml にマージする。
 *
 *   node scripts/merge-research.mjs <batch>            # 差分を表示するだけ
 *   node scripts/merge-research.mjs <batch> --apply    # 実際に書き込む
 *
 * 調査結果に書かれているフィールドは「公式に記載があった」ことを意味するので、
 * 既存値と食い違えば**調査結果で上書きする**（既存値は出典のない未検証値のため）。
 *
 * 並列で走るエージェントには1施設1ファイルを書かせ、マージはここに集約する。
 * 複数のエージェントが同じYAMLを同時に編集すると壊れるため。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 調査で埋める対象。ここに無いフィールドは調査結果に入っていても無視する。
 *
 * `URL` を含めているのは、登録URLの陳腐化が想像以上に多いため
 * （調査した13施設のうち5件がDNS切れ・410・別施設のサイトだった）。
 */
const FACILITY_FIELDS = [
  'URL', '築年月', '駐車場', 'TEL', '開館時間', '閉館時間', '休館日',
  '申込URL', '料金URL', '最寄駅', '部屋', '出典',
]

const FACILITY_ORDER = [
  'ID', '施設名', '施設名かな', '都道府県', '市区町村', '番地以下', '建物',
  '築年月', 'TEL', '開館時間', '閉館時間', '休館日',
  'URL', '申込URL', '料金URL', '駐車場', '最寄駅', '部屋', 'ピアノ有無', '出典',
  '経度', '緯度',
]
const ROOM_ORDER = [
  '部屋名', 'ホール種別', '客席数', '面積', '定員',
  '舞台幅', '舞台奥行',
  '管楽器', '打楽器', '楽器制限',
  'ピアノ有無', 'ピアノ種別', 'ピアノメーカー',
  'パイプオルガン', 'オルガン製作者',
  '譜面台貸出', '譜面台数', '楽屋収容人数', '親子室',
]

const batch = process.argv[2]
const apply = process.argv.includes('--apply')
if (!batch) {
  console.error('使い方: node scripts/merge-research.mjs <batch> [--apply]')
  process.exit(1)
}

const dir = resolve(root, 'data/research', batch)
if (!existsSync(dir)) { console.error(`${dir} がありません`); process.exit(1) }

const results = new Map() // "file:ID" → 調査結果
for (const name of readdirSync(dir).filter(n => n.endsWith('.yaml'))) {
  const m = name.match(/^(concerthall|practice)-(\d+)\.yaml$/)
  if (!m) { console.warn(`⚠ 命名規則に合わないので無視: ${name}`); continue }
  let data = yaml.load(readFileSync(resolve(dir, name), 'utf8'))
  // 元データが施設の配列なので、1件だけのリストとして書かれてくることがある。
  // 黙って捨てると取りこぼすので、要素1つのリストは中身を取り出して受け入れる
  if (Array.isArray(data) && data.length === 1) data = data[0]
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.warn(`⚠ 施設1件のマッピングになっていないので無視: ${name}`)
    continue
  }
  if (data.ID !== Number(m[2])) {
    console.warn(`⚠ ファイル名とIDが不一致なので無視: ${name} (中身の ID=${data.ID})`)
    continue
  }
  results.set(`${m[1]}:${m[2]}`, data)
}

const order = (obj, keys, nested) => {
  const o = {}
  for (const k of keys) {
    if (obj[k] == null) continue
    o[k] = k === '部屋' && nested ? obj[k].map(r => order(r, ROOM_ORDER)) : obj[k]
  }
  return o
}

let changed = 0
for (const file of ['concerthall', 'practice']) {
  const path = resolve(root, `data/facilities/${file}.yaml`)
  const records = yaml.load(readFileSync(path, 'utf8'))
  let touched = false

  for (const r of records) {
    const found = results.get(`${file}:${r.ID}`)
    if (!found) continue

    const diffs = []
    for (const k of FACILITY_FIELDS) {
      if (found[k] == null) continue
      const before = JSON.stringify(r[k])
      const after = JSON.stringify(found[k])
      if (before === after) continue
      diffs.push(`    ${k}: ${before ?? '(なし)'} → ${after}`)
      r[k] = found[k]
      touched = true
    }
    if (diffs.length > 0) {
      console.log(`  [${file} ID:${r.ID}] ${r.施設名}`)
      console.log(diffs.join('\n'))
      changed++
    }
  }

  if (touched && apply) {
    const out = records.map(r => order(r, FACILITY_ORDER, true))
    writeFileSync(path, yaml.dump(out, { allowUnicode: true, lineWidth: -1, indent: 2, noRefs: true }), 'utf8')
  }
}

console.log(`\n調査結果 ${results.size}件 / 変更のある施設 ${changed}件`)
console.log(apply ? '✓ 書き込みました' : '（--apply を付けると書き込みます）')
