/**
 * 地図のスタイル（MapLibre の style JSON）を組み立てる。
 *
 * タイルは OpenStreetMap Foundation が配信するベクトルタイル（Shortbread スキーマ）。
 * 既製のスタイル（VersaTiles Colorful など）は300を超えるレイヤーでPOIまで描くが、
 * このサイトの地図で見たいのは施設のピンなので、地は**クリームの紙に薄く刷った程度**に
 * 抑えている。道路・水面・緑地・府県境・地名・駅名だけを描く。
 *
 * **色は tokens.css の `--map-*` から読む**（→ `MAP_COLOR_TOKENS`）。WebGL で塗るので
 * CSS変数をそのまま渡せず、描画の直前に値を読んで埋め込む。色の表を2か所に持たないため。
 */
import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from 'maplibre-gl'

/**
 * 配信元のURLは**ここにしか書かない**。OSMF の利用規約が、配信停止やブロックに
 * 備えてURLを散らばらせないよう求めているため（差し替えはこの3つで済む）。
 * https://operations.osmfoundation.org/policies/vector/
 */
export const MAP_TILES_URL = 'https://vector.openstreetmap.org/shortbread_v1/{z}/{x}/{y}.mvt'
export const MAP_GLYPHS_URL =
  'https://vector.openstreetmap.org/styles/shortbread/fonts/{fontstack}/{range}.pbf'
/** 規約で表示が必須。地図の右下に出る */
export const MAP_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'

/** 配色の役割 → tokens.css の変数名 */
export const MAP_COLOR_TOKENS = {
  land: '--map-land',
  green: '--map-green',
  water: '--map-water',
  building: '--map-building',
  road: '--map-road',
  roadCasing: '--map-road-casing',
  motorway: '--map-motorway',
  motorwayCasing: '--map-motorway-casing',
  rail: '--map-rail',
  boundary: '--map-boundary',
  label: '--map-label',
  labelStrong: '--map-label-strong',
  labelWater: '--map-label-water',
  halo: '--map-halo',
} as const

export type MapColors = Record<keyof typeof MAP_COLOR_TOKENS, string>

/**
 * CSS変数の値を集める。読み口を引数にしているのは、ブラウザでは
 * `getComputedStyle` を、テストでは表を渡せるようにするため。
 * **1つでも欠けていたら止める**（黒で塗られた地図が出るより早く気づける）。
 */
export function readMapColors(read: (name: string) => string): MapColors {
  const entries = Object.entries(MAP_COLOR_TOKENS).map(([role, name]) => {
    const value = read(name).trim()
    if (!value) throw new Error(`地図の色 ${name} が tokens.css にありません`)
    return [role, value]
  })
  return Object.fromEntries(entries) as MapColors
}

const SOURCE = 'osm'

/** OSMF が配信する Noto Sans。漢字・かなはブラウザの字形で描く（→ Map の localIdeographFontFamily） */
const FONT = ['noto_sans_regular']
const FONT_BOLD = ['noto_sans_bold']

/** ズームに応じて線幅・文字を大きくする。地図の線は指数で太らせないと拡大したとき細く見える */
const byZoom = (stops: [zoom: number, px: number][]): ExpressionSpecification => [
  'interpolate',
  ['exponential', 1.6],
  ['zoom'],
  ...stops.flat(),
]

const kindIn = (...kinds: string[]): ExpressionSpecification => [
  'in',
  ['get', 'kind'],
  ['literal', kinds],
]

/** 日本の国道は多くが trunk なので、金色は高速道路（motorway）だけにする。国道まで塗ると広域が金の網になる */
const MOTORWAY = ['motorway']
const MAJOR = ['trunk', 'primary', 'secondary']
const MINOR = ['tertiary', 'unclassified', 'residential', 'living_street']
/** 地下鉄は地上に線を引くと道路と紛らわしいので描かない */
const RAIL = ['rail', 'light_rail', 'narrow_gauge', 'monorail', 'funicular']

const notTunnel: ExpressionSpecification = ['!=', ['get', 'tunnel'], true]

export function buildMapStyle(c: MapColors): StyleSpecification {
  const layers: LayerSpecification[] = [
    { id: 'land', type: 'background', paint: { 'background-color': c.land } },
    {
      id: 'green',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'land',
      filter: kindIn(
        'park',
        'forest',
        'grass',
        'meadow',
        'grassland',
        'scrub',
        'heath',
        'garden',
        'golf_course',
        'recreation_ground',
        'village_green',
        'cemetery',
      ),
      paint: { 'fill-color': c.green },
    },
    {
      id: 'water',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'water_polygons',
      filter: ['!=', ['get', 'kind'], 'glacier'],
      paint: { 'fill-color': c.water },
    },
    {
      id: 'ocean',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'ocean',
      paint: { 'fill-color': c.water },
    },
    {
      id: 'river',
      type: 'line',
      source: SOURCE,
      'source-layer': 'water_lines',
      filter: ['all', kindIn('river', 'canal'), notTunnel],
      paint: {
        'line-color': c.water,
        'line-width': byZoom([
          [9, 1],
          [16, 8],
        ]),
      },
    },
    {
      id: 'building',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'buildings',
      minzoom: 14,
      paint: {
        'fill-color': c.building,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 1],
      },
    },
    {
      id: 'boundary-pref',
      type: 'line',
      source: SOURCE,
      'source-layer': 'boundaries',
      filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], true]],
      paint: {
        'line-color': c.boundary,
        'line-width': byZoom([
          [6, 0.6],
          [12, 1.5],
        ]),
        'line-dasharray': [4, 2],
      },
    },
    // 道路は縁取り → 中身の順に重ねる。細い道を下に、高速道路を一番上に置く
    {
      id: 'road-minor',
      type: 'line',
      source: SOURCE,
      'source-layer': 'streets',
      minzoom: 12,
      filter: ['all', kindIn(...MINOR), notTunnel],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.road,
        'line-width': byZoom([
          [12, 0.5],
          [18, 14],
        ]),
      },
    },
    {
      id: 'road-major-casing',
      type: 'line',
      source: SOURCE,
      'source-layer': 'streets',
      minzoom: 9,
      filter: ['all', kindIn(...MAJOR), notTunnel],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.roadCasing,
        'line-width': byZoom([
          [9, 1],
          [18, 22],
        ]),
      },
    },
    {
      id: 'road-major',
      type: 'line',
      source: SOURCE,
      'source-layer': 'streets',
      minzoom: 9,
      filter: ['all', kindIn(...MAJOR), notTunnel],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.road,
        'line-width': byZoom([
          [9, 0.5],
          [18, 18],
        ]),
      },
    },
    {
      id: 'rail',
      type: 'line',
      source: SOURCE,
      'source-layer': 'streets',
      minzoom: 8,
      filter: ['all', kindIn(...RAIL), notTunnel],
      paint: {
        'line-color': c.rail,
        'line-width': byZoom([
          [8, 0.6],
          [16, 2.5],
        ]),
      },
    },
    {
      id: 'road-motorway-casing',
      type: 'line',
      source: SOURCE,
      'source-layer': 'streets',
      minzoom: 7,
      filter: ['all', kindIn(...MOTORWAY), notTunnel],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.motorwayCasing,
        'line-width': byZoom([
          [7, 1],
          [18, 24],
        ]),
      },
    },
    {
      id: 'road-motorway',
      type: 'line',
      source: SOURCE,
      'source-layer': 'streets',
      minzoom: 7,
      filter: ['all', kindIn(...MOTORWAY), notTunnel],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.motorway,
        'line-width': byZoom([
          [7, 0.6],
          [18, 20],
        ]),
      },
    },
    // 文字。縁取り（halo）をクリームにして、地の上でも道路の上でも読めるようにする
    {
      id: 'label-water',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'water_polygons_labels',
      minzoom: 11,
      layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 11 },
      paint: { 'text-color': c.labelWater, 'text-halo-color': c.halo, 'text-halo-width': 1.2 },
    },
    {
      id: 'label-station',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'public_transport',
      minzoom: 12,
      filter: kindIn('station', 'halt'),
      layout: {
        'text-field': ['get', 'name'],
        'text-font': FONT,
        'text-size': byZoom([
          [12, 10],
          [16, 13],
        ]),
      },
      paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 1.5 },
    },
    {
      id: 'label-suburb',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'place_labels',
      minzoom: 11,
      filter: kindIn('suburb', 'quarter', 'village', 'neighbourhood'),
      layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 11 },
      paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 1.5 },
    },
    {
      id: 'label-town',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'place_labels',
      minzoom: 9,
      filter: kindIn('town'),
      layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 12 },
      paint: { 'text-color': c.labelStrong, 'text-halo-color': c.halo, 'text-halo-width': 1.5 },
    },
    {
      id: 'label-city',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'place_labels',
      filter: kindIn('city', 'capital', 'state_capital'),
      layout: {
        'text-field': ['get', 'name'],
        'text-font': FONT_BOLD,
        'text-size': byZoom([
          [6, 11],
          [12, 16],
        ]),
      },
      paint: { 'text-color': c.labelStrong, 'text-halo-color': c.halo, 'text-halo-width': 2 },
    },
  ]

  return {
    version: 8,
    glyphs: MAP_GLYPHS_URL,
    sources: {
      [SOURCE]: {
        type: 'vector',
        tiles: [MAP_TILES_URL],
        minzoom: 0,
        maxzoom: 14,
        attribution: MAP_ATTRIBUTION,
      },
    },
    layers,
  }
}
