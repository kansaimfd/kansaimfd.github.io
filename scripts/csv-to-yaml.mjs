/**
 * CSV → concerthall.yaml 変換スクリプト
 * Google スプレッドシートから書き出した CSV を YAML に変換します。
 *
 * 使い方:
 *   node scripts/csv-to-yaml.mjs
 *   → data/facilities/concerthall.yaml が上書きされます（事前にバックアップ推奨）
 *
 * Google スプレッドシートからの書き出し手順:
 *   ファイル → ダウンロード → カンマ区切り形式 (.csv)
 *   → data/facilities/concerthall.csv として保存
 */

import { readFileSync, writeFileSync } from 'fs'
import jsyaml from 'js-yaml'
const { dump } = jsyaml

const CSV_PATH  = 'data/facilities/concerthall.csv'
const YAML_PATH = 'data/facilities/concerthall.yaml'

// CSV パーサー（RFC 4180 準拠）
function parseCsv(text) {
  // BOM 除去
  const content = text.replace(/^\uFEFF/, '')
  const lines = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (ch === '"') {
      if (inQuote && content[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === '\n' && !inQuote) {
      lines.push(cur); cur = ''
    } else if (ch === '\r' && !inQuote) {
      // skip
    } else {
      cur += ch
    }
  }
  if (cur) lines.push(cur)

  return lines.map(line => {
    const cells = []
    let cell = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cell += '"'; i++ }
        else inQ = !inQ
      } else if (ch === ',' && !inQ) {
        cells.push(cell); cell = ''
      } else {
        cell += ch
      }
    }
    cells.push(cell)
    return cells
  })
}

function toNum(s) {
  if (s === '' || s == null) return undefined
  const n = Number(s)
  return isNaN(n) ? undefined : n
}

function toStr(s) {
  return (s === '' || s == null) ? undefined : s.trim()
}

const raw = readFileSync(CSV_PATH, 'utf8')
const rows = parseCsv(raw)
const [header, ...dataRows] = rows

const idx = {}
header.forEach((col, i) => { idx[col.trim()] = i })

const halls = dataRows
  .filter(r => r.length > 1 && r[idx['ID']]?.trim())
  .map(r => {
    const get = col => r[idx[col]]?.trim() ?? ''

    // 最寄駅配列を組み立て
    const stations = []
    for (let n = 1; n <= 3; n++) {
      const eki = toStr(get(`最寄駅${n}_駅`))
      if (!eki) continue
      const entry = { 駅: eki }
      const rosen = toStr(get(`最寄駅${n}_路線`))
      if (rosen) entry['路線'] = rosen
      const aruki = toNum(get(`最寄駅${n}_駅徒歩`))
      if (aruki != null) entry['駅徒歩'] = aruki
      // YAML出力時に路線→駅→駅徒歩の順にしたいので再構成
      const ordered = {}
      if (entry['路線']) ordered['路線'] = entry['路線']
      ordered['駅'] = entry['駅']
      if (entry['駅徒歩'] != null) ordered['駅徒歩'] = entry['駅徒歩']
      stations.push(ordered)
    }

    const hall = {}

    // 必須フィールド
    hall['ID']       = Number(get('ID'))
    hall['施設名']   = get('施設名')
    hall['都道府県'] = get('都道府県')
    hall['市区町村'] = get('市区町村')
    hall['番地以下'] = get('番地以下')

    // 任意文字列フィールド
    const optStr = ['部屋名', '分類', '築年月', 'URL', '申込URL', '料金URL',
                    'ピアノ有無', 'パイプオルガン', '譜面台貸出', '親子室']
    for (const k of optStr) {
      const v = toStr(get(k))
      if (v) hall[k] = v
    }

    // 最寄駅配列
    if (stations.length > 0) hall['最寄駅'] = stations

    // 任意数値フィールド
    const optNum = ['客席数', '駐車場', '舞台幅', '舞台奥行', '舞台高さ']
    for (const k of optNum) {
      const v = toNum(get(k))
      if (v != null) hall[k] = v
    }

    // 座標（必須）
    hall['経度'] = Number(get('経度'))
    hall['緯度'] = Number(get('緯度'))

    return hall
  })

const yaml = dump(halls, {
  allowUnicode: true,
  lineWidth: 120,
  indent: 2,
})

writeFileSync(YAML_PATH, yaml, 'utf8')
console.log(`Written: ${YAML_PATH} (${halls.length} entries)`)
