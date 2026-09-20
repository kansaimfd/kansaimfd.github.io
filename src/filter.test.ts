import { describe, expect, it } from 'vitest'
import {
  applyConditions,
  matchAny,
  matchAtLeast,
  matchAtMost,
  matchAvailability,
  matchOneOf,
  matchRange,
  matchText,
  type Condition,
} from './filter'

describe('matchText', () => {
  it('空の検索語は指定なし', () => {
    expect(matchText('いずみホール', '')).toBe('pass')
  })

  it('部分一致で拾う', () => {
    expect(matchText('いずみホール', 'いずみ')).toBe('pass')
    expect(matchText('いずみホール', 'ざ・フェニックス')).toBe('fail')
  })

  /** 打ち方の違いだけで0件になると、利用者には理由が分からない */
  it('全角・半角と大文字・小文字の違いを吸収する', () => {
    expect(matchText('RHY梅田', 'ＲＨＹ')).toBe('pass')
    expect(matchText('RHY梅田', 'rhy')).toBe('pass')
    expect(matchText('ＫＯＫＯ ＰＬＡＺＡ', 'koko')).toBe('pass')
  })
})

describe('matchOneOf', () => {
  it('選択が空なら指定なし', () => {
    expect(matchOneOf('音楽専用', [])).toBe('pass')
    expect(matchOneOf(undefined, [])).toBe('pass')
  })

  it('当たれば合う、外れれば合わない', () => {
    expect(matchOneOf('音楽専用', ['音楽専用', '多目的'])).toBe('pass')
    expect(matchOneOf('小ホール・サロン', ['音楽専用'])).toBe('fail')
  })

  /** ここが「なし」ではなく「未調査」であることが、この型の存在理由 */
  it('値が未調査なら判断できない', () => {
    expect(matchOneOf(undefined, ['音楽専用'])).toBe('unknown')
    expect(matchOneOf(null, ['音楽専用'])).toBe('unknown')
  })
})

describe('matchAny', () => {
  it('1つでも当たれば合う', () => {
    expect(matchAny(['大阪駅', '梅田駅'], ['梅田駅'])).toBe('pass')
    expect(matchAny(['大阪駅'], ['梅田駅'])).toBe('fail')
  })

  it('持っている値が1つも無ければ判断できない', () => {
    expect(matchAny([], ['梅田駅'])).toBe('unknown')
    // 選択が空なら、そもそも絞っていないので指定なし
    expect(matchAny([], [])).toBe('pass')
  })
})

describe('matchRange', () => {
  it('上下とも空なら指定なし', () => {
    expect(matchRange(500, ['', ''])).toBe('pass')
    expect(matchRange(undefined, ['', ''])).toBe('pass')
  })

  // 舞台寸法は小数で書かれるものが多い（いずみホールは 19.4×10.5m）
  it('小数の範囲を扱える', () => {
    expect(matchRange(19.4, ['16.5', '20.8'])).toBe('pass')
    expect(matchRange(19.4, ['19.5', ''])).toBe('fail')
    // 打ちかけの「16.」は 16 として比較する（URLを往復する途中の値）
    expect(matchRange(19.4, ['16.', ''])).toBe('pass')
  })

  it('範囲に収まるかを見る', () => {
    expect(matchRange(800, ['500', '1000'])).toBe('pass')
    expect(matchRange(400, ['500', '1000'])).toBe('fail')
    expect(matchRange(1200, ['500', '1000'])).toBe('fail')
    // 境界は含む
    expect(matchRange(500, ['500', '1000'])).toBe('pass')
    expect(matchRange(1000, ['500', '1000'])).toBe('pass')
  })

  /** 客席数は一覧のホールの1割ほどに入っていない。ここを fail に倒すとそれが黙って消える */
  it('値が未調査なら判断できない', () => {
    expect(matchRange(undefined, ['500', ''])).toBe('unknown')
    expect(matchRange(null, ['', '1000'])).toBe('unknown')
  })
})

describe('matchAtLeast / matchAtMost', () => {
  it('片側だけの条件', () => {
    expect(matchAtLeast(50, '30')).toBe('pass')
    expect(matchAtLeast(20, '30')).toBe('fail')
    expect(matchAtLeast(undefined, '30')).toBe('unknown')
    expect(matchAtLeast(undefined, '')).toBe('pass')

    expect(matchAtMost(5, '10')).toBe('pass')
    expect(matchAtMost(15, '10')).toBe('fail')
    expect(matchAtMost(undefined, '10')).toBe('unknown')
    expect(matchAtMost(undefined, '')).toBe('pass')
  })
})

describe('matchAvailability', () => {
  it('3値をそのまま写す', () => {
    expect(matchAvailability(true)).toBe('pass')
    expect(matchAvailability(false)).toBe('fail')
    expect(matchAvailability(undefined)).toBe('unknown')
  })
})

describe('applyConditions', () => {
  interface Item {
    id: number
    seats?: number
    piano?: boolean
  }

  const seatsAtLeast = (min: string): Condition<Item> => ({
    label: '客席数',
    match: i => matchAtLeast(i.seats, min),
  })
  const hasPiano: Condition<Item> = {
    label: 'ピアノの有無',
    match: i => matchAvailability(i.piano),
  }

  const items: Item[] = [
    { id: 1, seats: 1000, piano: true },
    { id: 2, seats: 100, piano: true }, // 客席数が足りない
    { id: 3, piano: true }, // 客席数が未調査
    { id: 4, seats: 1000 }, // ピアノが未調査
    { id: 5, seats: 1000, piano: false }, // ピアノが無い
  ]

  it('条件が無ければ全件そのまま', () => {
    const r = applyConditions(items, [])
    expect(r.filtered).toEqual(items)
    expect(r.unknownExcluded).toBe(0)
    expect(r.unknownFields).toEqual([])
  })

  it('未調査で外れた件数と項目名を返す', () => {
    const r = applyConditions(items, [seatsAtLeast('500'), hasPiano])

    expect(r.filtered.map(i => i.id)).toEqual([1])
    // 2（客席数が足りない）と 5（ピアノが無い）は「合わない」ので数えない
    expect(r.unknownExcluded).toBe(2)
    expect(r.unknownFields).toEqual(['客席数', 'ピアノの有無'])
  })

  /**
   * 合わないことが確定しているなら、別の項目が未調査でも未調査のせいではない。
   * ここを混ぜると、条件を足すたびに除外件数が実態より膨らむ
   */
  it('合わない条件があるなら、未調査があっても数えない', () => {
    const r = applyConditions([{ id: 9, seats: 100 }], [seatsAtLeast('500'), hasPiano])
    expect(r.filtered).toEqual([])
    expect(r.unknownExcluded).toBe(0)
    expect(r.unknownFields).toEqual([])
  })

  it('項目名は条件の並び順に揃える（同じ絞り込みなら同じ文言になる）', () => {
    const forward = applyConditions(items, [seatsAtLeast('500'), hasPiano])
    const reversed = applyConditions(items, [hasPiano, seatsAtLeast('500')])
    expect(forward.unknownFields).toEqual(['客席数', 'ピアノの有無'])
    expect(reversed.unknownFields).toEqual(['ピアノの有無', '客席数'])
  })

  it('同じ項目で何件外れても、項目名は1度だけ挙げる', () => {
    const r = applyConditions([{ id: 1 }, { id: 2 }], [seatsAtLeast('500')])
    expect(r.unknownExcluded).toBe(2)
    expect(r.unknownFields).toEqual(['客席数'])
  })
})
