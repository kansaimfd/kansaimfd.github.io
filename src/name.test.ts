import { describe, expect, it } from 'vitest'
import { compareByName, kanaKey } from './name'

describe('kanaKey', () => {
  it('施設名かな があればそれを読みに使う', () => {
    expect(kanaKey({ 施設名: '住友生命いずみホール', 施設名かな: 'いずみほーる' })).toBe(
      'いずみほーる',
    )
  })

  it('かな・カナだけの施設名は機械的にひらがなへ寄せる', () => {
    expect(kanaKey({ 施設名: 'アイホール' })).toBe('あいほーる')
  })

  it('空白・中黒・括弧は読みの判定から外す', () => {
    expect(kanaKey({ 施設名: 'ザ・フェニックスホール' })).toBe('ざふぇにっくすほーる')
  })

  // 読みを推測して間違った位置に並べるより、末尾のグループへ送るほうが害が小さい
  it('漢字を含む名前は読みが決まらないので null', () => {
    expect(kanaKey({ 施設名: '京都コンサートホール' })).toBeNull()
  })

  it('ラテン文字を含む名前も null', () => {
    expect(kanaKey({ 施設名: 'KOKO PLAZA' })).toBeNull()
    expect(kanaKey({ 施設名: '100BANスタジオ' })).toBeNull()
  })
})

describe('compareByName', () => {
  const sorted = (names: string[]) =>
    names
      .map(施設名 => ({ 施設名 }))
      .sort(compareByName)
      .map(f => f.施設名)

  it('読みの分かるものを五十音順に並べる', () => {
    expect(sorted(['ホルトホール', 'アイホール', 'サンケイホール'])).toEqual([
      'アイホール',
      'サンケイホール',
      'ホルトホール',
    ])
  })

  // コードポイント順だとラテン文字・数字が先頭に来て、五十音の並びが分断される
  it('読みの決まらない名前は五十音のあとへ送る', () => {
    expect(sorted(['100BANスタジオ', '7th Note', 'KOKO PLAZA', 'アイホール'])).toEqual([
      'アイホール',
      '100BANスタジオ',
      '7th Note',
      'KOKO PLAZA',
    ])
  })

  it('読みの決まらないもの同士は名前順に並べる', () => {
    expect(sorted(['KOKO PLAZA', '7th Note'])).toEqual(['7th Note', 'KOKO PLAZA'])
  })

  it('施設名かな があれば漢字の施設も五十音に混ざる', () => {
    const list = [
      { 施設名: 'ホルトホール' },
      { 施設名: '京都コンサートホール', 施設名かな: 'きょうとこんさーとほーる' },
      { 施設名: 'アイホール' },
    ]
    expect(list.sort(compareByName).map(f => f.施設名)).toEqual([
      'アイホール',
      '京都コンサートホール',
      'ホルトホール',
    ])
  })
})
