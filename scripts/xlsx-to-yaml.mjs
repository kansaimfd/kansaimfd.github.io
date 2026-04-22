/**
 * facilities.xlsx → YAML 変換スクリプト
 * 「コンサートホール」シート → concerthall.yaml
 * 「練習場」シート         → practice.yaml
 *
 * 使い方:
 *   node scripts/xlsx-to-yaml.mjs
 *   → 各 YAML ファイルが上書きされます（事前にバックアップ推奨）
 *
 * Google スプレッドシートからの書き出し手順:
 *   ファイル → ダウンロード → Microsoft Excel (.xlsx)
 *   → data/facilities/facilities.xlsx として保存
 */

import { writeFileSync } from 'fs'
import jsyaml from 'js-yaml'
import ExcelJS from 'exceljs'

const { dump } = jsyaml

const XLSX_PATH = 'data/facilities/facilities.xlsx'

function toNum(v) {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

function toStr(v) {
  if (v === '' || v == null) return undefined
  return String(v).trim() || undefined
}

function getSheetRows(sheet) {
  const headerRow = sheet.getRow(1).values.slice(1)
  const idx = {}
  headerRow.forEach((col, i) => { if (col) idx[String(col).trim()] = i })

  const rows = []
  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return
    const vals = row.values.slice(1)
    const get = col => {
      const i = idx[col]
      if (i == null) return ''
      const v = vals[i]
      if (v == null) return ''
      if (typeof v === 'object' && v.text != null) return String(v.text).trim()
      return String(v).trim()
    }
    rows.push(get)
  })
  return rows
}

const workbook = new ExcelJS.Workbook()
await workbook.xlsx.readFile(XLSX_PATH)

// ── コンサートホール シート → concerthall.yaml ────────────────
const concertSheet = workbook.getWorksheet('コンサートホール')
if (!concertSheet) throw new Error('シート「コンサートホール」が見つかりません')

const halls = []
for (const get of getSheetRows(concertSheet)) {
  if (!get('ID')) continue

  const stations = []
  for (let n = 1; n <= 3; n++) {
    const eki = toStr(get(`最寄駅${n}_駅`))
    if (!eki) continue
    const entry = {}
    const rosen = toStr(get(`最寄駅${n}_路線`))
    if (rosen) entry['路線'] = rosen
    entry['駅'] = eki
    const aruki = toNum(get(`最寄駅${n}_駅徒歩`))
    if (aruki != null) entry['駅徒歩'] = aruki
    stations.push(entry)
  }

  const hall = {}
  hall['ID']       = Number(get('ID'))
  hall['施設名']   = get('施設名')
  hall['都道府県'] = get('都道府県')
  hall['市区町村'] = get('市区町村')
  hall['番地以下'] = get('番地以下')

  for (const k of ['部屋名', '分類', '築年月', 'URL', '申込URL', '料金URL',
                    'ピアノ有無', 'パイプオルガン', '譜面台貸出', '親子室']) {
    const v = toStr(get(k))
    if (v) hall[k] = v
  }

  if (stations.length > 0) hall['最寄駅'] = stations

  for (const k of ['客席数', '駐車場', '舞台幅', '舞台奥行', '舞台高さ']) {
    const v = toNum(get(k))
    if (v != null) hall[k] = v
  }

  hall['経度'] = Number(get('経度'))
  hall['緯度'] = Number(get('緯度'))
  halls.push(hall)
}

writeFileSync('data/facilities/concerthall.yaml', dump(halls, { allowUnicode: true, lineWidth: 120, indent: 2 }), 'utf8')
console.log(`Written: data/facilities/concerthall.yaml (${halls.length} entries)`)

// ── 練習場 シート → practice.yaml ──────────────────────────
const practiceSheet = workbook.getWorksheet('練習場')
if (!practiceSheet) throw new Error('シート「練習場」が見つかりません')

const practices = []
for (const get of getSheetRows(practiceSheet)) {
  if (!get('ID')) continue

  const practice = {}
  practice['ID']       = Number(get('ID'))
  practice['施設名']   = get('施設名')
  practice['都道府県'] = get('都道府県')
  practice['市区町村'] = get('市区町村')
  practice['番地以下'] = get('番地以下')

  for (const k of ['URL', '分類', '最寄駅', 'ピアノ有無']) {
    const v = toStr(get(k))
    if (v) practice[k] = v
  }

  const aruki = toNum(get('最寄駅徒歩'))
  if (aruki != null) practice['最寄駅徒歩'] = aruki

  practice['経度'] = Number(get('経度'))
  practice['緯度'] = Number(get('緯度'))
  practices.push(practice)
}

writeFileSync('data/facilities/practice.yaml', dump(practices, { allowUnicode: true, lineWidth: 120, indent: 2 }), 'utf8')
console.log(`Written: data/facilities/practice.yaml (${practices.length} entries)`)
