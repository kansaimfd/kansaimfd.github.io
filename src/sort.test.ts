import { describe, it, expect } from 'vitest'
import { compareUnknownLast, sortOptions } from './sort'

describe('compareUnknownLast', () => {
  it('分かっている値は向きどおりに並べる', () => {
    expect(compareUnknownLast(300, 2000, 1)).toBeLessThan(0)
    expect(compareUnknownLast(300, 2000, -1)).toBeGreaterThan(0)
    expect(compareUnknownLast(2000, 300, 1)).toBeGreaterThan(0)
    expect(compareUnknownLast(2000, 300, -1)).toBeLessThan(0)
  })

  it('文字列も比較できる', () => {
    expect(compareUnknownLast('京都府', '兵庫県', 1)).toBeLessThan(0)
  })

  // 同値で順序が入れ替わると、絞り込みを変えるたびに一覧が跳ねる
  it('同じ値なら元の順序のまま', () => {
    expect(compareUnknownLast(500, 500, 1)).toBe(0)
    expect(compareUnknownLast(500, 500, -1)).toBe(0)
  })

  // 向きを変えたときに未調査が先頭を占めないこと（これがこの関数の目的）
  it('未調査はどちらの向きでも後ろへ送る', () => {
    for (const dir of [1, -1]) {
      expect(compareUnknownLast(undefined, 300, dir)).toBeGreaterThan(0)
      expect(compareUnknownLast(300, undefined, dir)).toBeLessThan(0)
    }
  })

  it('未調査どうしは元の順序のまま', () => {
    expect(compareUnknownLast(undefined, undefined, 1)).toBe(0)
  })
})

describe('sortOptions', () => {
  it('キーごとに昇順・降順の両方を作る', () => {
    expect(sortOptions(['都道府県'])).toEqual([
      { key: '都道府県', asc: true, label: '都道府県（昇順）' },
      { key: '都道府県', asc: false, label: '都道府県（降順）' },
    ])
  })

  // 「まず選びたい向き」を先に出す。客席数は多い順、徒歩は近い順
  it('先に出す向きは項目ごとに決まっている', () => {
    expect(sortOptions(['客席数'])[0]).toEqual({
      key: '客席数',
      asc: false,
      label: '客席数（多い順）',
    })
    expect(sortOptions(['最寄駅徒歩'])[0].asc).toBe(true)
  })

  it('渡した順に並べる', () => {
    expect(sortOptions(['施設名', '最寄駅徒歩']).map(o => o.key)).toEqual([
      '施設名',
      '施設名',
      '最寄駅徒歩',
      '最寄駅徒歩',
    ])
  })
})
