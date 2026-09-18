import { describe, expect, it } from 'vitest'
import {
  availabilityMark,
  availabilityText,
  hasEquipment,
  pianoDetail,
  standDetail,
} from './availability'

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

describe('availabilityText', () => {
  it('あり / なし を言葉にする', () => {
    expect(availabilityText(true)).toBe('あり')
    expect(availabilityText(false)).toBe('なし')
  })

  // 記号と同じく、読み上げでも「なし」と「未調査」を混同させない
  it('未調査を「なし」と区別する', () => {
    expect(availabilityText(undefined)).toBe('未調査')
    expect(availabilityText(undefined)).not.toBe(availabilityText(false))
  })

  it('3値すべてに対応する記号がある', () => {
    for (const v of [true, false, undefined]) {
      expect(availabilityText(v)).not.toBe('')
      expect(availabilityMark(v)).not.toBe('')
    }
  })
})

describe('hasEquipment', () => {
  it('絞り込みに残るのは true だけ', () => {
    expect(hasEquipment(true)).toBe(true)
    expect(hasEquipment(false)).toBe(false)
    expect(hasEquipment(undefined)).toBe(false)
  })
})

describe('pianoDetail', () => {
  it('種別とメーカーを繋ぐ', () => {
    expect(
      pianoDetail({ ピアノ有無: true, ピアノ種別: 'グランド', ピアノメーカー: 'スタインウェイ' }),
    ).toBe('グランド・スタインウェイ')
  })

  it('片方だけ分かっている場合は分かっているほうを出す', () => {
    expect(pianoDetail({ ピアノ有無: true, ピアノ種別: 'アップライト' })).toBe('アップライト')
  })

  // 有無と詳細を別々に返すので、詳細が無いことは空文字ではなく undefined で表す
  it('詳細が分からなければ undefined', () => {
    expect(pianoDetail({ ピアノ有無: true })).toBeUndefined()
    expect(pianoDetail({})).toBeUndefined()
  })
})

describe('standDetail', () => {
  it('本数が分かれば本数を返す', () => {
    expect(standDetail({ 譜面台貸出: true, 譜面台数: 5 })).toBe('5本')
  })

  // 「あるが本数は不明」を表せることがこの形にしている理由
  it('本数が分からなければ undefined', () => {
    expect(standDetail({ 譜面台貸出: true })).toBeUndefined()
  })
})
