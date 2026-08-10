/**
 * YAML（正規化・人間が編集）→ JSON（非正規化・UIが消費）
 *
 *   data/facilities/concerthall.yaml  1レコード = 1施設（部屋[] を内包）
 *     ├→ src/data/concerthallFacilities.json  施設単位（詳細ページ用）
 *     └→ src/data/concerthalls.json           施設 × ホール に平坦化（一覧・地図用）
 *   data/facilities/practice.yaml
 *     └→ src/data/practices.json              施設単位
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

/** 不動産の表示に関する公正競争規約: 道路距離80mにつき徒歩1分、端数切り上げ */
const METERS_PER_MINUTE = 80

function loadYaml(relPath) {
  return yaml.load(readFileSync(resolve(root, relPath), 'utf-8'))
}

/**
 * 駅距離（道路距離・m）しか分からない施設のために徒歩分数を補完する。
 * 補完は 距離→徒歩 の一方向のみ。逆方向（徒歩→距離）は切り上げのぶん偽の精度になり、
 * かつ消費者がいないため行わない。
 */
function fillWalkMinutes(stations) {
  if (!Array.isArray(stations)) return stations
  return stations.map(s => {
    if (s.駅徒歩 != null || s.駅距離 == null) return s
    return { ...s, 駅徒歩: Math.ceil(s.駅距離 / METERS_PER_MINUTE), 駅徒歩推定: true }
  })
}

/** 設備フィールド。true=あり / false=なし / キーなし=未調査 の3値 */
const AVAILABILITY_FIELDS = ['ピアノ有無', 'パイプオルガン', '譜面台貸出', '親子室']

/**
 * 〇/× が書かれていないか検査する。
 * 「×」を「未調査」の意味で使う運用に戻ると、実際には設備がある施設が
 * 絞り込みから消えるため、文字列を見つけた時点でビルドを止める。
 */
function assertNoMarks(obj, path = '') {
  if (Array.isArray(obj)) return obj.forEach((v, i) => assertNoMarks(v, `${path}[${i}]`))
  if (obj == null || typeof obj !== 'object') return
  for (const [k, v] of Object.entries(obj)) {
    if (AVAILABILITY_FIELDS.includes(k) && typeof v !== 'boolean' && v != null) {
      throw new Error(
        `${path}.${k} が boolean ではありません: ${JSON.stringify(v)}\n` +
        `  〇 → true / × → false で記述してください。未調査の項目はキーごと省略します。`
      )
    }
    assertNoMarks(v, `${path}.${k}`)
  }
}

const SEIREI_CITIES = ['大阪市', '神戸市', '京都市', '堺市']

/**
 * 住所の記述ルールを検査する。
 * 表記が揺れているとジオコーディングでの座標検算（課題#7）が効かなくなるため、
 * ビルドを止めて気づけるようにする。
 */
function assertAddress(f, label) {
  const fail = msg => { throw new Error(`${label} ${f.施設名}: ${msg}`) }

  if (/[０-９]/.test(f.番地以下)) fail(`番地以下に全角数字があります: ${f.番地以下}`)
  if (/[−－]/.test(f.番地以下)) fail(`番地以下に全角ハイフンがあります: ${f.番地以下}`)
  if (f.番地以下.includes(f.都道府県) || f.番地以下.includes(f.市区町村)) {
    fail(`番地以下に都道府県・市区町村が重複しています: ${f.番地以下}`)
  }
  if (SEIREI_CITIES.includes(f.市区町村)) {
    fail(`政令市は区まで書いてください: ${f.市区町村}`)
  }
  if (/[町村]$/.test(f.市区町村) && !/[市郡]/.test(f.市区町村)) {
    fail(`郡部は郡名から書いてください: ${f.市区町村}`)
  }
  // ビル名・階数が番地側にあるとジオコーディングの精度が落ちる
  if (/(ビル|階|[0-9]+F|B[0-9]+F)/i.test(f.番地以下)) {
    fail(`建物名は 建物 フィールドに分けてください: ${f.番地以下}`)
  }
}

/** 出典[].確認日 の最新値を 最終確認日 として持たせる（YAMLには書かない派生値） */
function withLastVerified(facility) {
  const dates = facility.出典?.map(s => s.確認日).filter(Boolean) ?? []
  return dates.length > 0
    ? { ...facility, 最終確認日: dates.reduce((a, b) => (a > b ? a : b)) }
    : facility
}

function normalize(facility, label) {
  assertNoMarks(facility, label)
  assertAddress(facility, label)
  const withStations = facility.最寄駅
    ? { ...facility, 最寄駅: fillWalkMinutes(facility.最寄駅) }
    : facility
  return withLastVerified(withStations)
}

/**
 * 施設 × ホール に平坦化する。
 * 部屋が未登録の施設も一覧から消えないよう、空の部屋を1つ補う。
 */
function flattenHalls(facilities) {
  return facilities.flatMap(facility => {
    const { 部屋, ...rest } = facility
    const rooms = 部屋?.length ? 部屋 : [{}]
    return rooms.map((room, i) => ({
      ...rest,
      ...room,
      キー: `${facility.ID}-${room.部屋名 ?? i}`,
    }))
  })
}

const concerthallFacilities = loadYaml('data/facilities/concerthall.yaml')
  .map(f => normalize(f, `concerthall ID:${f.ID}`))
const practices = loadYaml('data/facilities/practice.yaml')
  .map(f => normalize(f, `practice ID:${f.ID}`))
const concerthalls = flattenHalls(concerthallFacilities)

const outDir = resolve(root, 'src/data')
mkdirSync(outDir, { recursive: true })

const write = (name, data) =>
  writeFileSync(resolve(outDir, name), JSON.stringify(data, null, 2), 'utf-8')

write('concerthallFacilities.json', concerthallFacilities)
write('concerthalls.json', concerthalls)
write('practices.json', practices)

const allFacilities = [...concerthallFacilities, ...practices]
const estimated = concerthalls.concat(practices)
  .flatMap(f => f.最寄駅 ?? [])
  .filter(s => s.駅徒歩推定).length
const unsourced = allFacilities.filter(f => !f.最終確認日).length

console.log(
  `Built: ${concerthallFacilities.length} hall facilities ` +
  `→ ${concerthalls.length} halls, ${practices.length} practices` +
  (estimated > 0 ? ` (徒歩分数を距離から補完: ${estimated}件)` : '')
)
if (unsourced > 0) {
  console.warn(`⚠ 出典が未記録の施設: ${unsourced} / ${allFacilities.length} 件`)
}
