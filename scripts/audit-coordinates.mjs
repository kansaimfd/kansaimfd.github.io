/**
 * 保存されている座標を、国土地理院のジオコーディングで検算する監査スクリプト。
 *
 *   node scripts/audit-coordinates.mjs               # 全件
 *   node scripts/audit-coordinates.mjs --file practice
 *   node scripts/audit-coordinates.mjs --id 160 --file practice
 *   node scripts/audit-coordinates.mjs --json out.json
 *
 * ビルドには組み込まない。外部APIに依存する検査を毎回のビルドで走らせないため
 * （build-data.mjs のバリデーションはオフライン検査のみに限定している）。
 *
 * 住所は「建物名を除いた」形で問い合わせる。ビル名や階数が入ると精度が落ちるため。
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const ENDPOINT = 'https://msearch.gsi.go.jp/address-search/AddressSearch'
/** 連続アクセスの間隔（ms）。公共APIなので余裕を持たせる */
const INTERVAL = 400

/** ズレの判定しきい値（m） */
const OK = 150
const SUSPECT = 500

const args = process.argv.slice(2)
const getArg = n => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : null }
const onlyFile = getArg('--file')
const onlyId = getArg('--id') ? Number(getArg('--id')) : null
const jsonOut = getArg('--json')

/** 緯度経度の距離（m）。関西の緯度で十分な近似 */
function distance(lat1, lon1, lat2, lon2) {
  const dLat = (lat1 - lat2) * 111_000
  const dLon = (lon1 - lon2) * 111_000 * Math.cos((lat1 * Math.PI) / 180)
  return Math.hypot(dLat, dLon)
}

/** 建物名を含まない住所（src/address.ts の geocodableAddress と同じ規則） */
const geocodable = f => `${f.都道府県}${f.市区町村}${f.番地以下}`

/**
 * 返ってきた住所が番地レベルまで解決できているか。
 * 京都の通り名住所などは区レベルまでしか当たらず、その座標で判定すると誤検出になる。
 */
const isPrecise = title => /(丁目|番|号|[0-9０-９])/.test(title.replace(/^.*?[市区町村]/, ''))

async function geocode(address) {
  const res = await fetch(`${ENDPOINT}?q=${encodeURIComponent(address)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const hits = await res.json()
  if (!Array.isArray(hits) || hits.length === 0) return null
  const [lon, lat] = hits[0].geometry.coordinates
  return { lat, lon, title: hits[0].properties.title }
}

function load(file) {
  return yaml.load(readFileSync(resolve(root, `data/facilities/${file}.yaml`), 'utf8'))
    .map(r => ({ ...r, _file: file }))
}

const targets = ['concerthall', 'practice']
  .filter(f => !onlyFile || f === onlyFile)
  .flatMap(load)
  .filter(r => onlyId === null || r.ID === onlyId)

console.log(`対象: ${targets.length}件  （間隔 ${INTERVAL}ms、推定 ${Math.ceil(targets.length * INTERVAL / 1000)}秒）\n`)

const results = []
for (const [i, f] of targets.entries()) {
  const address = geocodable(f)
  let row
  try {
    const hit = await geocode(address)
    if (!hit) {
      row = { 判定: '該当なし', 距離: null, 照合先: null }
    } else if (!isPrecise(hit.title)) {
      row = { 判定: '精度不足', 距離: Math.round(distance(f.緯度, f.経度, hit.lat, hit.lon)), 照合先: hit }
    } else {
      const d = Math.round(distance(f.緯度, f.経度, hit.lat, hit.lon))
      row = { 判定: d <= OK ? '一致' : d <= SUSPECT ? '要確認' : '要修正', 距離: d, 照合先: hit }
    }
  } catch (e) {
    row = { 判定: 'エラー', 距離: null, 照合先: null, error: e.message }
  }

  results.push({ file: f._file, ID: f.ID, 施設名: f.施設名, 住所: address, 緯度: f.緯度, 経度: f.経度, ...row })
  process.stdout.write(`\r  ${i + 1}/${targets.length}`)
  if (i < targets.length - 1) await new Promise(r => setTimeout(r, INTERVAL))
}
process.stdout.write('\r\x1b[K')

// ── 集計 ────────────────────────────────────────────────────
const order = ['要修正', '要確認', '精度不足', '該当なし', 'エラー', '一致']
const byVerdict = Object.fromEntries(order.map(v => [v, results.filter(r => r.判定 === v)]))

console.log('=== 集計 ===')
for (const v of order) if (byVerdict[v].length) console.log(`  ${v.padEnd(6)} ${byVerdict[v].length}件`)

for (const v of ['要修正', '要確認', '該当なし', 'エラー']) {
  if (!byVerdict[v].length) continue
  console.log(`\n=== ${v} ===`)
  for (const r of byVerdict[v].sort((a, b) => (b.距離 ?? 0) - (a.距離 ?? 0))) {
    console.log(`  [${r.file} ID:${r.ID}] ${r.施設名}`)
    console.log(`    住所   ${r.住所}`)
    console.log(`    保存   ${r.緯度}, ${r.経度}`)
    if (r.照合先) console.log(`    国土地理院 ${r.照合先.lat}, ${r.照合先.lon}  (${r.照合先.title})  差 ${r.距離}m`)
    if (r.error) console.log(`    ${r.error}`)
  }
}

if (byVerdict['精度不足'].length) {
  console.log('\n=== 精度不足（住所が番地まで解決できず、判定対象外）===')
  for (const r of byVerdict['精度不足']) {
    console.log(`  [${r.file} ID:${r.ID}] ${r.施設名} — ${r.住所} → ${r.照合先?.title ?? '—'}`)
  }
}

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(results, null, 2), 'utf8')
  console.log(`\n結果を書き出しました: ${jsonOut}`)
}
