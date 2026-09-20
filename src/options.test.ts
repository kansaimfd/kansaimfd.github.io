import { describe, it, expect } from 'vitest'
import { cityOptions, equipOptions, prefOptions, stationOptions } from './options'
import type { Availability, Station } from './types'

const item = (
  都道府県: string,
  市区町村: string,
  駅: (string | Station)[] = [],
): { 都道府県: string; 市区町村: string; 最寄駅?: Station[] } => ({
  都道府県,
  市区町村,
  最寄駅: 駅.map(s => (typeof s === 'string' ? { 駅: s } : s)),
})

/** 束の中身を「府県: 値, 値」の形にして、並びごと確かめられるようにする */
const shape = (groups: { label: string; options: { value: string }[] }[]) =>
  groups.map(g => `${g.label}: ${g.options.map(o => o.value).join(', ')}`)

describe('cityOptions', () => {
  const items = [
    item('兵庫県', '神戸市中央区'),
    item('大阪府', '大阪市北区'),
    item('大阪府', '吹田市'),
    item('大阪府', '大阪市西区'),
    // 同じ市区町村の施設が複数あっても選択肢は1つ
    item('大阪府', '吹田市'),
  ]

  it('府県ごとに束ね、府県はピルと同じ並びにする', () => {
    expect(shape(cityOptions(items, [], ''))).toEqual([
      '大阪府: 吹田市, 大阪市北区, 大阪市西区',
      '兵庫県: 神戸市中央区',
    ])
  })

  it('選んだ府県の中だけに絞る', () => {
    expect(shape(cityOptions(items, ['兵庫県'], ''))).toEqual(['兵庫県: 神戸市中央区'])
  })

  it('選ばれている市区町村は、府県の外でも必ず残す', () => {
    // URLを手で書き換えれば起きる。絞り込みには効いているのに選択欄が未選択に見えると、
    // 「0件だがなぜか分からない」画面になる
    expect(shape(cityOptions(items, ['大阪府'], '神戸市中央区'))).toEqual([
      '大阪府: 吹田市, 大阪市北区, 大阪市西区',
      '兵庫県: 神戸市中央区',
    ])
  })

  it('データに無い市区町村が選ばれていたら、それだけの束を先頭に置く', () => {
    expect(shape(cityOptions(items, [], '架空市'))).toEqual([
      '選択中: 架空市',
      '大阪府: 吹田市, 大阪市北区, 大阪市西区',
      '兵庫県: 神戸市中央区',
    ])
  })

  it('表に無い府県は後ろへ回す', () => {
    const 未知 = [...items, item('東京都', '千代田区')]
    expect(shape(cityOptions(未知, [], '')).at(-1)).toBe('東京都: 千代田区')
  })
})

describe('stationOptions', () => {
  const items = [
    item('大阪府', '大阪市北区', ['梅田駅', '大阪駅']),
    item('大阪府', '吹田市', ['江坂駅']),
    item('兵庫県', '神戸市中央区', ['三宮駅']),
    item('京都府', '京都市下京区'),
  ]

  it('府県で絞る。駅を持たない施設は何も足さない', () => {
    expect(shape(stationOptions(items, ['大阪府'], '', ''))).toEqual([
      '大阪府: 大阪駅, 梅田駅, 江坂駅',
    ])
  })

  it('市区町村でさらに絞る', () => {
    expect(shape(stationOptions(items, ['大阪府'], '吹田市', ''))).toEqual(['大阪府: 江坂駅'])
  })

  it('選ばれている駅は、範囲の外でも必ず残す', () => {
    expect(shape(stationOptions(items, ['大阪府'], '吹田市', '三宮駅'))).toEqual([
      '大阪府: 江坂駅',
      '兵庫県: 三宮駅',
    ])
  })

  it('バス停には表示名に「（バス停）」を添える。値は駅名のまま', () => {
    const バス = [item('大阪府', '平野区', [{ 駅: '出戸バスターミナル', 種別: 'バス停' }])]
    const [group] = stationOptions(バス, [], '', '')
    expect(group.options).toEqual([
      { value: '出戸バスターミナル', label: '出戸バスターミナル（バス停）' },
    ])
  })

  it('データに無い駅が選ばれていたら、それだけの束を先頭に置く', () => {
    expect(shape(stationOptions(items, ['兵庫県'], '', '架空駅'))).toEqual([
      '選択中: 架空駅',
      '兵庫県: 三宮駅',
    ])
  })

  it('同じ名前の駅は最初の府県の束にだけ置く', () => {
    const 同名 = [item('大阪府', '大阪市福島区', ['野田駅']), item('京都府', '京都市', ['野田駅'])]
    expect(shape(stationOptions(同名, [], '', ''))).toEqual(['大阪府: 野田駅'])
  })
})

describe('prefOptions', () => {
  it('施設のある府県だけを、ピルの並びで返す', () => {
    expect(prefOptions([{ 都道府県: '滋賀県' }, { 都道府県: '大阪府' }])).toEqual([
      '大阪府',
      '滋賀県',
    ])
  })
})

describe('equipOptions', () => {
  const fields = [
    { key: 'piano', state: (x: { piano?: Availability }) => x.piano },
    { key: 'organ', state: () => undefined },
  ] as const

  it('記録が1件も無い項目は落とす', () => {
    expect(equipOptions(fields, [{ piano: false }]).map(f => f.key)).toEqual(['piano'])
    expect(equipOptions(fields, [{}])).toEqual([])
  })
})
