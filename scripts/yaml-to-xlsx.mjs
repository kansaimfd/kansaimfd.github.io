/**
 * YAML → facilities.xlsx 変換スクリプト
 * 既存の facilities.xlsx を開き、データ行（2行目以降）のみを更新します。
 * ヘッダー行・データ行にサイトのデザイン色を適用します。
 *
 * 使い方:
 *   node scripts/yaml-to-xlsx.mjs
 */

import { readFileSync } from 'fs'
import yaml from 'js-yaml'
import ExcelJS from 'exceljs'

const { load: parse } = yaml

const XLSX_PATH = 'data/facilities/facilities.xlsx'

const CONCERT_COLUMNS = [
  'ID', '施設名', '部屋名', '都道府県', '市区町村', '番地以下',
  '分類', '築年月', 'URL', '申込URL', '料金URL',
  '最寄駅1_路線', '最寄駅1_駅', '最寄駅1_駅徒歩',
  '最寄駅2_路線', '最寄駅2_駅', '最寄駅2_駅徒歩',
  '最寄駅3_路線', '最寄駅3_駅', '最寄駅3_駅徒歩',
  '客席数', '駐車場', '舞台幅', '舞台奥行', '舞台高さ',
  'ピアノ有無', 'パイプオルガン', '譜面台貸出', '親子室',
  '経度', '緯度',
]

const PRACTICE_COLUMNS = [
  'ID', '施設名', '都道府県', '市区町村', '番地以下',
  'URL', '分類', '最寄駅', '最寄駅徒歩', 'ピアノ有無',
  '経度', '緯度',
]

function updateSheetData(sheet, columns, dataRows) {
  // 2行目以降のデータ行をすべて削除
  const lastRow = sheet.rowCount
  if (lastRow >= 2) {
    sheet.spliceRows(2, lastRow - 1)
  }

  // 新しいデータ行を追記
  for (const row of dataRows) {
    sheet.addRow(columns.map(col => row[col] ?? ''))
  }
}

// ── コンサートホール ──────────────────────────────────────────
const halls = parse(readFileSync('data/facilities/concerthall.yaml', 'utf8'))
const concertRows = halls.map(h => {
  const stations = h['最寄駅'] ?? []
  return {
    'ID':         h['ID'],
    '施設名':     h['施設名'],
    '部屋名':     h['部屋名'] ?? '',
    '都道府県':   h['都道府県'],
    '市区町村':   h['市区町村'],
    '番地以下':   h['番地以下'],
    '分類':       h['分類'] ?? '',
    '築年月':     h['築年月'] ?? '',
    'URL':        h['URL'] ?? '',
    '申込URL':    h['申込URL'] ?? '',
    '料金URL':    h['料金URL'] ?? '',
    '最寄駅1_路線':   stations[0]?.['路線'] ?? '',
    '最寄駅1_駅':     stations[0]?.['駅'] ?? '',
    '最寄駅1_駅徒歩': stations[0]?.['駅徒歩'] ?? '',
    '最寄駅2_路線':   stations[1]?.['路線'] ?? '',
    '最寄駅2_駅':     stations[1]?.['駅'] ?? '',
    '最寄駅2_駅徒歩': stations[1]?.['駅徒歩'] ?? '',
    '最寄駅3_路線':   stations[2]?.['路線'] ?? '',
    '最寄駅3_駅':     stations[2]?.['駅'] ?? '',
    '最寄駅3_駅徒歩': stations[2]?.['駅徒歩'] ?? '',
    '客席数':     h['客席数'] ?? '',
    '駐車場':     h['駐車場'] ?? '',
    '舞台幅':     h['舞台幅'] ?? '',
    '舞台奥行':   h['舞台奥行'] ?? '',
    '舞台高さ':   h['舞台高さ'] ?? '',
    'ピアノ有無':     h['ピアノ有無'] ?? '',
    'パイプオルガン': h['パイプオルガン'] ?? '',
    '譜面台貸出':     h['譜面台貸出'] ?? '',
    '親子室':         h['親子室'] ?? '',
    '経度': h['経度'],
    '緯度': h['緯度'],
  }
})

// ── 練習場 ────────────────────────────────────────────────────
const practices = parse(readFileSync('data/facilities/practice.yaml', 'utf8'))
const practiceRows = practices.map(p => ({
  'ID':       p['ID'],
  '施設名':   p['施設名'],
  '都道府県': p['都道府県'],
  '市区町村': p['市区町村'],
  '番地以下': p['番地以下'],
  'URL':      p['URL'] ?? '',
  '分類':     p['分類'] ?? '',
  '最寄駅':   p['最寄駅'] ?? '',
  '最寄駅徒歩': p['最寄駅徒歩'] ?? '',
  'ピアノ有無': p['ピアノ有無'] ?? '',
  '経度': p['経度'],
  '緯度': p['緯度'],
}))

// ── 既存ファイルを開いてデータ行のみ更新 ──────────────────────
const workbook = new ExcelJS.Workbook()
await workbook.xlsx.readFile(XLSX_PATH)

const concertSheet = workbook.getWorksheet('コンサートホール')
if (!concertSheet) throw new Error('シート「コンサートホール」が見つかりません')
updateSheetData(concertSheet, CONCERT_COLUMNS, concertRows)

const practiceSheet = workbook.getWorksheet('練習場')
if (!practiceSheet) throw new Error('シート「練習場」が見つかりません')
updateSheetData(practiceSheet, PRACTICE_COLUMNS, practiceRows)

await workbook.xlsx.writeFile(XLSX_PATH)
console.log(`Updated: ${XLSX_PATH}`)
console.log(`  コンサートホール: ${halls.length} rows`)
console.log(`  練習場: ${practices.length} rows`)
