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
import { validate, report } from './validate.mjs'

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

/** 出典[].確認日 の最新値を 最終確認日 として持たせる（YAMLには書かない派生値） */
function withLastVerified(facility) {
  const dates = facility.出典?.map(s => s.確認日).filter(Boolean) ?? []
  return dates.length > 0
    ? { ...facility, 最終確認日: dates.reduce((a, b) => (a > b ? a : b)) }
    : facility
}

function normalize(facility) {
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

const rawConcerthalls = loadYaml('data/facilities/concerthall.yaml')
const rawPractices = loadYaml('data/facilities/practice.yaml')

// 検査は変換前の生データに対して行う。派生値（駅徒歩の補完など）を混ぜると
// 何がYAMLに書かれていた値なのか分からなくなるため
// 駅座標マスタは検算にのみ使う。無くても検査は動く（その分の検査が省かれるだけ）
let stationMaster
try {
  stationMaster = JSON.parse(readFileSync(resolve(root, 'data/stations.json'), 'utf-8'))
} catch {
  console.warn('⚠ data/stations.json がないため、駅座標との突き合わせを省略します')
}

const verbose = process.argv.includes('--verbose')
if (report(validate([
  { file: 'concerthall', records: rawConcerthalls },
  { file: 'practice', records: rawPractices },
], { stationMaster }), { verbose })) {
  console.error('\nデータに誤りがあるためビルドを中止しました。')
  process.exit(1)
}

const concerthallFacilities = rawConcerthalls.map(normalize)
const practices = rawPractices.map(normalize)
const concerthalls = flattenHalls(concerthallFacilities)

const outDir = resolve(root, 'src/data')
mkdirSync(outDir, { recursive: true })

const write = (name, data) =>
  writeFileSync(resolve(outDir, name), JSON.stringify(data, null, 2), 'utf-8')

write('concerthallFacilities.json', concerthallFacilities)
write('concerthalls.json', concerthalls)
write('practices.json', practices)

const estimated = concerthalls.concat(practices)
  .flatMap(f => f.最寄駅 ?? [])
  .filter(s => s.駅徒歩推定).length

console.log(
  `Built: ${concerthallFacilities.length} hall facilities ` +
  `→ ${concerthalls.length} halls, ${practices.length} practices` +
  (estimated > 0 ? ` (徒歩分数を距離から補完: ${estimated}件)` : '')
)
