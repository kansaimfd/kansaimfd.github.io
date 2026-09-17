import { describe, expect, it } from 'vitest'
import { fullAddress, geocodableAddress, localAddress } from './address'

const 施設 = {
  都道府県: '大阪府',
  市区町村: '大阪市中央区',
  番地以下: '1-2-3',
  建物: 'テストビル5F',
}

describe('fullAddress', () => {
  it('都道府県から建物まで繋ぐ', () => {
    expect(fullAddress(施設)).toBe('大阪府大阪市中央区1-2-3 テストビル5F')
  })

  it('建物がなければ余分な空白を残さない', () => {
    expect(fullAddress({ ...施設, 建物: undefined })).toBe('大阪府大阪市中央区1-2-3')
  })
})

describe('localAddress', () => {
  it('府県が別に表示されている場所向けに都道府県を省く', () => {
    expect(localAddress(施設)).toBe('大阪市中央区1-2-3 テストビル5F')
  })

  it('建物がなければ余分な空白を残さない', () => {
    expect(localAddress({ ...施設, 建物: undefined })).toBe('大阪市中央区1-2-3')
  })
})

describe('geocodableAddress', () => {
  // ビル名や階数が入ると住所検索の精度が落ちるため、座標検算には使わせない
  it('建物名を含めない', () => {
    expect(geocodableAddress(施設)).toBe('大阪府大阪市中央区1-2-3')
  })

  it('建物の有無で結果が変わらない', () => {
    expect(geocodableAddress({ ...施設, 建物: undefined })).toBe(geocodableAddress(施設))
  })
})
