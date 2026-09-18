import { describe, expect, it } from 'vitest'
import { toggleIn, toggleKey } from './toggle'

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
