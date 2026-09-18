import { describe, expect, it } from 'vitest'
import { nextSort, toggleIn, toggleKey } from './toggle'

describe('toggleIn', () => {
  it('入っていなければ足す', () => {
    expect(toggleIn(['大阪府'], '京都府')).toEqual(['大阪府', '京都府'])
  })

  it('入っていれば外す', () => {
    expect(toggleIn(['大阪府', '京都府'], '大阪府')).toEqual(['京都府'])
  })

  // Reactの状態として持つので、元の配列を書き換えると再描画が起きない
  it('元の配列は変えない', () => {
    const prefs = ['大阪府']
    toggleIn(prefs, '京都府')
    expect(prefs).toEqual(['大阪府'])
  })
})

describe('toggleKey', () => {
  it('入っていなければ足し、入っていれば外す', () => {
    expect([...toggleKey(new Set(['piano']), 'organ')]).toEqual(['piano', 'organ'])
    expect([...toggleKey(new Set(['piano', 'organ']), 'piano')]).toEqual(['organ'])
  })

  it('元の集合は変えない', () => {
    const equip = new Set(['piano'])
    toggleKey(equip, 'organ')
    expect([...equip]).toEqual(['piano'])
  })
})

describe('nextSort', () => {
  it('同じキーなら向きを反転する', () => {
    expect(nextSort({ key: '施設名', asc: true }, '施設名')).toEqual({ key: '施設名', asc: false })
    expect(nextSort({ key: '施設名', asc: false }, '施設名')).toEqual({ key: '施設名', asc: true })
  })

  // 別のキーに移ったのに降順のままだと、押した本人の意図と合わない
  it('違うキーなら昇順から始める', () => {
    expect(nextSort({ key: '施設名', asc: false }, '客席数')).toEqual({ key: '客席数', asc: true })
  })
})
