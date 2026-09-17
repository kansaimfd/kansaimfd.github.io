import { describe, expect, it } from 'vitest'
import { availabilityMark, hasEquipment, pianoLabel, standLabel } from './availability'

describe('availabilityMark', () => {
  it('あり / なし を記号にする', () => {
    expect(availabilityMark(true)).toBe('〇')
    expect(availabilityMark(false)).toBe('×')
  })

  // undefined は「なし」ではなく「未調査」。× と同じ見た目にすると誤った情報になる
  it('未調査を「なし」と区別する', () => {
    expect(availabilityMark(undefined)).toBe('—')
    expect(availabilityMark(undefined)).not.toBe(availabilityMark(false))
  })
})

describe('hasEquipment', () => {
  it('絞り込みに残るのは true だけ', () => {
    expect(hasEquipment(true)).toBe(true)
    expect(hasEquipment(false)).toBe(false)
    expect(hasEquipment(undefined)).toBe(false)
  })
})

describe('pianoLabel', () => {
  it('分かっている詳細を記号に添える', () => {
    expect(
      pianoLabel({ ピアノ有無: true, ピアノ種別: 'グランド', ピアノメーカー: 'スタインウェイ' }),
    ).toBe('〇 グランド・スタインウェイ')
  })

  it('詳細が分からなければ記号のみ', () => {
    expect(pianoLabel({ ピアノ有無: true })).toBe('〇')
  })

  it('片方だけ分かっている場合は分かっているほうを出す', () => {
    expect(pianoLabel({ ピアノ有無: true, ピアノ種別: 'アップライト' })).toBe('〇 アップライト')
  })

  it('未調査なら未調査の記号', () => {
    expect(pianoLabel({})).toBe('—')
  })
})

describe('standLabel', () => {
  it('本数が分かれば添える', () => {
    expect(standLabel({ 譜面台貸出: true, 譜面台数: 5 })).toBe('〇 5本')
  })

  // 「あるが本数は不明」を表せることがこの形にしている理由
  it('本数が分からなければ記号のみ', () => {
    expect(standLabel({ 譜面台貸出: true })).toBe('〇')
  })
})
