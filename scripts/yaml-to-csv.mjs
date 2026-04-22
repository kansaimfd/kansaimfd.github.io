/**
 * concerthall.yaml → CSV 変換スクリプト
 * 出力した CSV を Google スプレッドシートにインポートして編集できます。
 *
 * 使い方:
 *   node scripts/yaml-to-csv.mjs
 *   → data/facilities/concerthall.csv が生成されます
 */

import { readFileSync, writeFileSync } from 'fs'
import yaml from 'js-yaml'
const { load: parse } = yaml

const YAML_PATH = 'data/facilities/concerthall.yaml'
const CSV_PATH  = 'data/facilities/concerthall.csv'

// 列定義（順序固定）
const COLUMNS = [
  'ID',
  '施設名',
  '部屋名',
  '都道府県',
  '市区町村',
  '番地以下',
  '分類',
  '築年月',
  'URL',
  '申込URL',
  '料金URL',
  '最寄駅1_路線',
  '最寄駅1_駅',
  '最寄駅1_駅徒歩',
  '最寄駅2_路線',
  '最寄駅2_駅',
  '最寄駅2_駅徒歩',
  '最寄駅3_路線',
  '最寄駅3_駅',
  '最寄駅3_駅徒歩',
  '客席数',
  '駐車場',
  '舞台幅',
  '舞台奥行',
  '舞台高さ',
  'ピアノ有無',
  'パイプオルガン',
  '譜面台貸出',
  '親子室',
  '経度',
  '緯度',
]

function csvCell(value) {
  if (value == null) return ''
  const s = String(value)
  // カンマ・改行・ダブルクォートを含む場合はクォート
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

const halls = parse(readFileSync(YAML_PATH, 'utf8'))

const rows = halls.map(h => {
  const stations = h['最寄駅'] ?? []
  const row = {
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
    '最寄駅1_路線': stations[0]?.['路線'] ?? '',
    '最寄駅1_駅':   stations[0]?.['駅']   ?? '',
    '最寄駅1_駅徒歩': stations[0]?.['駅徒歩'] ?? '',
    '最寄駅2_路線': stations[1]?.['路線'] ?? '',
    '最寄駅2_駅':   stations[1]?.['駅']   ?? '',
    '最寄駅2_駅徒歩': stations[1]?.['駅徒歩'] ?? '',
    '最寄駅3_路線': stations[2]?.['路線'] ?? '',
    '最寄駅3_駅':   stations[2]?.['駅']   ?? '',
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
  return COLUMNS.map(col => csvCell(row[col])).join(',')
})

const csv = [COLUMNS.join(','), ...rows].join('\n')
writeFileSync(CSV_PATH, '\uFEFF' + csv, 'utf8') // BOM付きUTF-8（Excel/Sheets対応）
console.log(`Written: ${CSV_PATH} (${halls.length} rows)`)
