import { describe, expect, it } from 'vitest'
import { builtYear, formatBuiltDate } from './builtDate'

describe('formatBuiltDate', () => {
  it('YYYY-MM を日本語の年月にする', () => {
    expect(formatBuiltDate('1990-11')).toBe('1990年11月')
  })

  it('月の頭の0は落とす', () => {
    expect(formatBuiltDate('1995-04')).toBe('1995年4月')
  })

  it('形が違う値はそのまま出す', () => {
    expect(formatBuiltDate('1990')).toBe('1990')
    expect(formatBuiltDate('1990-13')).toBe('1990-13')
    expect(formatBuiltDate('1990年11月')).toBe('1990年11月')
  })
})

describe('builtYear', () => {
  it('年を数で返す', () => {
    expect(builtYear('1990-11')).toBe(1990)
    expect(builtYear('1990')).toBe(1990)
  })

  it('未調査（undefined）と年が読めない値は undefined', () => {
    expect(builtYear(undefined)).toBeUndefined()
    expect(builtYear('不明')).toBeUndefined()
  })
})
