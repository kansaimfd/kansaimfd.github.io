/**
 * 国土数値情報「鉄道データ(N02)」から、関西の駅座標マスタ data/stations.json を生成する。
 *
 * 座標の検算（施設と最寄駅の距離が 駅距離/駅徒歩 と矛盾していないか）に使う。
 * 生成は随時。出力はコミットするので、通常の開発では実行不要。
 *
 * 使い方:
 *   1. https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2024.html から
 *      N02-24_GML.zip をダウンロードして展開する
 *   2. node scripts/build-station-master.mjs <展開先>/UTF-8/N02-24_Station.geojson
 *
 * 出典: 国土数値情報（鉄道データ）国土交通省
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 関西6府県を覆う範囲 [南, 北, 西, 東]。府県境ではなく余裕を持たせた矩形 */
const BOX = [33.3, 35.9, 134.1, 136.6]

/** 同一駅名でこの距離以内のセグメントは同じ駅とみなす（m） */
const SAME_STATION = 500

const input = process.argv[2]
if (!input) {
  console.error('使い方: node scripts/build-station-master.mjs <N02-XX_Station.geojson>')
  process.exit(1)
}

/** N02の駅は線路に沿った LineString なので、中点を駅の位置とする */
function midpoint(coords) {
  const lat = coords.reduce((s, p) => s + p[1], 0) / coords.length
  const lon = coords.reduce((s, p) => s + p[0], 0) / coords.length
  return [lat, lon]
}

function distance(lat1, lon1, lat2, lon2) {
  const dLat = (lat1 - lat2) * 111_000
  const dLon = (lon1 - lon2) * 111_000 * Math.cos((lat1 * Math.PI) / 180)
  return Math.hypot(dLat, dLon)
}

const geojson = JSON.parse(readFileSync(input, 'utf8'))

const segments = geojson.features
  .map(f => ({
    駅: f.properties.N02_005,
    路線: f.properties.N02_003,
    事業者: f.properties.N02_004,
    pos: midpoint(f.geometry.coordinates),
  }))
  .filter(s => {
    const [lat, lon] = s.pos
    return lat >= BOX[0] && lat <= BOX[1] && lon >= BOX[2] && lon <= BOX[3]
  })

// 同じ駅が路線ごとに複数セグメントに分かれているのでまとめる。
// ただし同名の別駅（JR福島駅と阪神福島駅など）は別エントリのまま残す。
//
// **事業者が違えば、近くても別の駅として扱う。** 以前は駅名と距離（500m以内）だけで
// まとめていたため、約400m離れた阪急と阪神の大阪梅田駅が1点になり、座標がその中間に来ていた。
// 阪神側の出口に近い施設（大阪駅前第3ビル）が「公式の徒歩3分より実際は遠い」と誤って警告された。
// 検査は同名の候補のうち施設に最も近いものを採るので、分けておけば取り違えない
const byName = new Map()
for (const s of segments) {
  const key = `${s.駅}|${s.事業者}`
  if (!byName.has(key)) byName.set(key, [])
  byName.get(key).push(s)
}

const stations = []
for (const segs of byName.values()) {
  const name = segs[0].駅
  const clusters = []
  for (const s of segs) {
    const hit = clusters.find(c => distance(c.緯度, c.経度, s.pos[0], s.pos[1]) < SAME_STATION)
    if (hit) {
      hit.count++
      hit.緯度 += (s.pos[0] - hit.緯度) / hit.count
      hit.経度 += (s.pos[1] - hit.経度) / hit.count
      hit.路線.add(s.路線)
      hit.事業者.add(s.事業者)
    } else {
      clusters.push({
        緯度: s.pos[0],
        経度: s.pos[1],
        count: 1,
        路線: new Set([s.路線]),
        事業者: new Set([s.事業者]),
      })
    }
  }
  for (const c of clusters) {
    stations.push({
      駅: name,
      緯度: Number(c.緯度.toFixed(6)),
      経度: Number(c.経度.toFixed(6)),
      路線: [...c.路線].sort(),
      事業者: [...c.事業者].sort(),
    })
  }
}

stations.sort((a, b) => a.駅.localeCompare(b.駅, 'ja') || a.緯度 - b.緯度)

const out = {
  出典: '国土数値情報（鉄道データ）国土交通省',
  元データ: input.split(/[/\\]/).pop(),
  生成日: new Date().toISOString().slice(0, 10),
  範囲: { 南: BOX[0], 北: BOX[1], 西: BOX[2], 東: BOX[3] },
  駅: stations,
}

const path = resolve(root, 'data/stations.json')
writeFileSync(path, JSON.stringify(out, null, 1), 'utf8')

const dupes = stations.length - new Set(stations.map(s => s.駅)).size
console.log(
  `✓ data/stations.json に ${stations.length}駅を書き出しました（同名の別駅 ${dupes}件を含む）`,
)
