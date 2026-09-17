import { describe, expect, it } from 'vitest'
import type { Rental } from './types'
import { isStillRentable, rentalBadgeLabel, rentalNotice } from './rental'

describe('rentalNotice', () => {
  it('通常どおり貸している施設では何も出さない', () => {
    expect(rentalNotice(undefined)).toBeUndefined()
  })

  it('休止は期間と理由を添える', () => {
    const r: Rental = { 状態: '休止', 開始: '2025-04', 再開: '2027-03', 理由: '大規模改修工事' }
    expect(rentalNotice(r)).toBe('貸館休止中（2025-04 〜 2027-03・大規模改修工事）')
  })

  it('再開時期が未定なら未定と書く', () => {
    expect(rentalNotice({ 状態: '休止', 開始: '2025-04' })).toBe(
      '貸館休止中（2025-04 〜 再開時期未定）',
    )
  })

  // 再開の告知だけ見つかり、いつ休みに入ったか分からない施設がある
  it('開始が分からなくても再開だけは出す', () => {
    expect(rentalNotice({ 状態: '休止', 再開: '2027-03' })).toBe(
      '貸館休止中（時期不明 〜 2027-03）',
    )
  })

  // 終了・廃止は再開しないことが定義なので、期間は始まりだけを出す
  it('終了は開始月だけを出す', () => {
    expect(rentalNotice({ 状態: '終了', 開始: '2024-03', 理由: '貸館業務終了' })).toBe(
      '貸館終了（2024-03・貸館業務終了）',
    )
  })

  it('廃止は施設そのものが無いことを示す', () => {
    expect(rentalNotice({ 状態: '廃止', 理由: '解体済み' })).toBe('閉館・解体済み（解体済み）')
  })

  // 予定は「これから休む」ので、休止の「再開時期未定」とは語が違う
  it('予定は終了時期未定と書く', () => {
    expect(rentalNotice({ 状態: '予定', 開始: '2027-04' })).toBe(
      '休館予定（2027-04 〜 終了時期未定）',
    )
  })

  it('期間も理由も分からなければ見出しだけ', () => {
    expect(rentalNotice({ 状態: '休止' })).toBe('貸館休止中')
  })
})

describe('isStillRentable', () => {
  // 予定は休館が告知されているだけで今日は借りられる。ホールの予約は12か月前から取るので、
  // 休止と同じ扱いにすると借りられる施設を借りられないものとして見せてしまう
  it('予定はまだ借りられる', () => {
    expect(isStillRentable({ 状態: '予定', 開始: '2027-04' })).toBe(true)
  })

  it('貸館の記載がなければ借りられる', () => {
    expect(isStillRentable(undefined)).toBe(true)
  })

  it('休止・終了・廃止は借りられない', () => {
    expect(isStillRentable({ 状態: '休止' })).toBe(false)
    expect(isStillRentable({ 状態: '終了' })).toBe(false)
    expect(isStillRentable({ 状態: '廃止' })).toBe(false)
  })
})

describe('rentalBadgeLabel', () => {
  it('バッジには期間や理由を入れない', () => {
    expect(rentalBadgeLabel({ 状態: '休止', 開始: '2025-04', 理由: '改修' })).toBe('休止中')
    expect(rentalBadgeLabel({ 状態: '終了' })).toBe('貸館終了')
    expect(rentalBadgeLabel({ 状態: '予定' })).toBe('休館予定')
    expect(rentalBadgeLabel({ 状態: '廃止' })).toBe('閉館・解体済み')
  })
})
