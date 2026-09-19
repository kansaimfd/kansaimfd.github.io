/// <reference types="node" />
// tokens.css をそのまま読むため node の型を引く（→ styles/contrast.test.ts と同じ事情）
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { MAP_COLOR_TOKENS, buildMapStyle, readMapColors } from './mapStyle'

const css = readFileSync(new URL('./styles/tokens.css', import.meta.url), 'utf8')
const tokens = Object.fromEntries(
  [...css.matchAll(/(--map-[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value]),
)

/** Shortbread 1.0 のレイヤー名。https://shortbread-tiles.org/schema/1.0/ */
const SHORTBREAD_LAYERS = [
  'ocean',
  'water_polygons',
  'water_polygons_labels',
  'water_lines',
  'water_lines_labels',
  'dam_lines',
  'dam_polygons',
  'pier_lines',
  'pier_polygons',
  'land',
  'sites',
  'buildings',
  'addresses',
  'streets',
  'street_polygons',
  'streets_polygons_labels',
  'street_labels',
  'street_labels_points',
  'aerialways',
  'public_transport',
  'bridges',
  'ferries',
  'boundaries',
  'boundary_labels',
  'place_labels',
  'pois',
]

describe('readMapColors', () => {
  it('tokens.css の --map-* を役割ごとに読む', () => {
    const colors = readMapColors(name => tokens[name] ?? '')
    expect(colors.land).toBe(tokens['--map-land'])
    expect(Object.keys(colors)).toEqual(Object.keys(MAP_COLOR_TOKENS))
  })

  it('tokens.css に無い色があれば名前を挙げて止まる', () => {
    expect(() => readMapColors(name => (name === '--map-water' ? '  ' : '#fff'))).toThrow(
      '--map-water',
    )
  })
})

describe('buildMapStyle', () => {
  const style = buildMapStyle(readMapColors(name => tokens[name] ?? ''))

  it('MapLibre のスタイル仕様に合っている', () => {
    expect(validateStyleMin(style)).toEqual([])
  })

  it('タイルに無いレイヤー名を参照していない（綴りを誤ると黙って何も描かれない）', () => {
    for (const layer of style.layers) {
      if ('source-layer' in layer) expect(SHORTBREAD_LAYERS).toContain(layer['source-layer'])
    }
  })

  it('色はすべて tokens.css から来ている', () => {
    const colors = new Set(Object.values(tokens))
    const used = JSON.stringify(style.layers).match(/"#[0-9a-fA-F]{3,6}"/g) ?? []
    for (const hex of used) expect(colors).toContain(JSON.parse(hex))
  })

  it('OSMF の規約どおり出典を載せる', () => {
    expect(JSON.stringify(style.sources)).toContain('openstreetmap.org/copyright')
  })
})
