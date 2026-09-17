import { describe, expect, it } from 'vitest'
import type { Station } from './types'
import { NO_WALK, lineLabel, minWalk, stationLabel, stationNames, walkLabel } from './station'

const station = (s: Partial<Station>): Station => ({ 駅: '新大阪駅', ...s })

describe('minWalk', () => {
  it('最寄駅がなければ NO_WALK', () => {
    expect(minWalk({})).toBe(NO_WALK)
    expect(minWalk({ 最寄駅: [] })).toBe(NO_WALK)
  })

  it('複数の最寄駅のうち最短を返す', () => {
    expect(minWalk({ 最寄駅: [station({ 駅徒歩: 12 }), station({ 駅徒歩: 5 })] })).toBe(5)
  })

  // 徒歩分数の分かる駅が1つでもあれば、それが最短として使われてほしい
  it('徒歩分数が不明な駅は最短の判定に混ぜない', () => {
    expect(minWalk({ 最寄駅: [station({}), station({ 駅徒歩: 7 })] })).toBe(7)
  })
})

describe('walkLabel', () => {
  it('徒歩分数が不明なら undefined', () => {
    expect(walkLabel(station({}))).toBeUndefined()
  })

  it('公式が徒歩分数を書いている場合はそのまま出す', () => {
    expect(walkLabel(station({ 駅徒歩: 5 }))).toBe('徒歩5分')
  })

  // 駅距離から補完した値は、公式の記載と同じ顔をさせない
  it('距離から補完した値には「約」を付ける', () => {
    expect(walkLabel(station({ 駅徒歩: 10, 駅徒歩推定: true }))).toBe('徒歩約10分')
  })
})

describe('lineLabel', () => {
  it('同一駅に乗り入れる複数路線を「・」で連ねる', () => {
    expect(lineLabel(station({ 路線: ['JR京都線', '大阪メトロ御堂筋線'] }))).toBe(
      'JR京都線・大阪メトロ御堂筋線',
    )
  })

  it('路線が未記録なら空文字', () => {
    expect(lineLabel(station({}))).toBe('')
  })
})

describe('stationLabel', () => {
  it('路線・駅・出口・徒歩分数を1行に連ねる', () => {
    const s = station({ 路線: ['JR京都線'], 駅: '新大阪駅', 出口: '東口', 駅徒歩: 7 })
    expect(stationLabel(s)).toBe('JR京都線 新大阪駅 東口 徒歩7分')
  })

  it('分からない項目は詰めて出す', () => {
    expect(stationLabel(station({ 駅: '新大阪駅' }))).toBe('新大阪駅')
  })
})

describe('stationNames', () => {
  it('最寄駅がなければ空配列', () => {
    expect(stationNames({})).toEqual([])
  })

  it('駅名だけを並べる', () => {
    expect(
      stationNames({ 最寄駅: [station({ 駅: '梅田駅' }), station({ 駅: '大阪駅' })] }),
    ).toEqual(['梅田駅', '大阪駅'])
  })
})
