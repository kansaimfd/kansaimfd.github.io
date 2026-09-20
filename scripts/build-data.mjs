/**
 * YAML（正規化・人間が編集）→ JSON（非正規化・UIが消費）
 *
 *   data/facilities/concerthall.yaml  1レコード = 1施設（部屋[] を内包）
 *     ├→ src/data/concerthalls.json           施設 × ホール に平坦化（一覧・地図用）
 *     ├→ src/data/practices.json（追記）      ホールでない部屋を練習場一覧へ
 *     └→ src/data/concert/<ID>.json           施設1件（詳細ページ用）
 *   data/facilities/practice.yaml
 *     ├→ src/data/practices.json              一覧用に絞ったもの
 *     └→ src/data/practice/<ID>.json          施設1件（詳細ページ用）
 *
 * **詳細ページ用は1施設1ファイルに分ける。** 全施設を1つのJSONにまとめていたころ、
 * `/concert/10` を直接開いた利用者は1施設を見るために88施設ぶん（gzip 171KB）を
 * 落としていた。ファイルを分ければ、動的importで見る施設のぶんだけが届く。
 *
 * ここは読み書きと検査の呼び出しだけ。変換の規則は transform.mjs にある。
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as yaml from 'js-yaml'
import { validate, report } from './validate.mjs'
import { normalize, flattenHalls, toPracticeList, toHallPracticeList } from './transform.mjs'
import { reportCoverage } from './coverage.mjs'

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
const detailedCoverage = process.argv.includes('--coverage')
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
const practiceFacilities = rawPractices.map(normalize)
const concerthalls = flattenHalls(concerthallFacilities)
// 練習場一覧には、コンサートホール施設に併設された練習室・リハーサル室なども並べる
const practices = [
  ...toPracticeList(practiceFacilities),
  ...toHallPracticeList(concerthallFacilities),
]

const outDir = resolve(root, 'src/data')
// 施設を削除したりIDを変えたりしたときに、前回の出力が残らないよう作り直す
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const write = (name, data) =>
  writeFileSync(resolve(outDir, name), JSON.stringify(data, null, 2), 'utf-8')

write('concerthalls.json', concerthalls)
write('practices.json', practices)

/** 詳細ページ用に1施設1ファイルで書き出す。ファイル名は詳細ページのURLと同じID */
function writeEach(dir, facilities) {
  mkdirSync(resolve(outDir, dir), { recursive: true })
  for (const facility of facilities) {
    write(`${dir}/${facility.ID}.json`, facility)
  }
}

writeEach('concert', concerthallFacilities)
writeEach('practice', practiceFacilities)

const estimated = concerthalls
  .concat(practiceFacilities)
  .flatMap(f => f.最寄駅 ?? [])
  .filter(s => s.駅徒歩推定).length

console.log(
  `Built: ${concerthallFacilities.length} hall facilities ` +
    `→ ${concerthalls.length} halls, ${practices.length} practices` +
    (estimated > 0 ? ` (徒歩分数を距離から補完: ${estimated}件)` : ''),
)

// 検査は「書かれている値が正しいか」しか見ない。書かれていない項目の多さはここで出す。
// 変換後の施設を渡す: 部屋は掲載される部屋だけになり（会議室などを落としたあと）、
// 出典の 記載なし が施設と部屋に配られている
reportCoverage(
  [
    { file: 'concerthall', records: concerthallFacilities },
    { file: 'practice', records: practiceFacilities },
  ],
  { detailed: detailedCoverage },
)
