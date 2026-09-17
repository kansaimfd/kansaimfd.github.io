/**
 * YAML（正規化・人間が編集）→ JSON（非正規化・UIが消費）
 *
 *   data/facilities/concerthall.yaml  1レコード = 1施設（部屋[] を内包）
 *     ├→ src/data/concerthallFacilities.json  施設単位（詳細ページ用）
 *     └→ src/data/concerthalls.json           施設 × ホール に平坦化（一覧・地図用）
 *   data/facilities/practice.yaml
 *     └→ src/data/practices.json              施設単位
 *
 * ここは読み書きと検査の呼び出しだけ。変換の規則は transform.mjs にある。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import { validate, report } from './validate.mjs'
import { normalize, flattenHalls } from './transform.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadYaml(relPath) {
  return yaml.load(readFileSync(resolve(root, relPath), 'utf-8'))
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
if (
  report(
    validate(
      [
        { file: 'concerthall', records: rawConcerthalls },
        { file: 'practice', records: rawPractices },
      ],
      { stationMaster },
    ),
    { verbose },
  )
) {
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

const estimated = concerthalls
  .concat(practices)
  .flatMap(f => f.最寄駅 ?? [])
  .filter(s => s.駅徒歩推定).length

console.log(
  `Built: ${concerthallFacilities.length} hall facilities ` +
    `→ ${concerthalls.length} halls, ${practices.length} practices` +
    (estimated > 0 ? ` (徒歩分数を距離から補完: ${estimated}件)` : ''),
)
