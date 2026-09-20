import { describe, it, expect } from 'vitest'
import { compareUnknownLast } from './sort'

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
