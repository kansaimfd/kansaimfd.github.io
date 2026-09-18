import { describe, expect, it, vi } from 'vitest'
import { fieldCoverage, freshness, lastCheckedOn, reportCoverage, thinnest } from './coverage.mjs'

const 施設 = (overrides = {}) => ({ ID: 10, 施設名: 'テストホール', ...overrides })
const row = (result, 名前) => result.rows.find(r => r.名前 === 名前)

describe('fieldCoverage', () => {
  it('施設単位の項目を数える', () => {
    const result = fieldCoverage({
      file: 'concerthall',
      records: [施設({ URL: 'https://example.com' }), 施設(), 施設({ URL: 'https://example.jp' })],
    })
    expect(row(result, 'URL')).toMatchObject({ 単位: '施設', 記入: 2, 母数: 3, 割合: 67 })
  })

  // 最寄駅・出典は配列。空配列は「調べたが無い」ではなく未記入として数える
  it('空配列は未記入として数える', () => {
    const result = fieldCoverage({ file: 'concerthall', records: [施設({ 最寄駅: [] })] })
    expect(row(result, '最寄駅').記入).toBe(0)
  })

  // false は「調べた結果ない」なので記入済み。未調査（キーの省略）と区別する
  it('false は記入済みとして数える', () => {
    const result = fieldCoverage({
      file: 'concerthall',
      records: [施設({ 部屋: [{ 親子室: false }] })],
    })
    expect(row(result, '親子室')).toMatchObject({ 記入: 1, 母数: 1, 割合: 100 })
  })

  it('部屋が1つも無ければ割合は0', () => {
    const result = fieldCoverage({ file: 'concerthall', records: [施設()] })
    expect(row(result, '客席数')).toMatchObject({ 記入: 0, 母数: 0, 割合: 0 })
  })

  /**
   * YAMLには会議室・和室のように音楽に使えない部屋も残してある（調査した事実として残す）。
   * 母数に混ぜると実態より薄く見えるので、掲載される部屋だけを渡せるようにしてある。
   */
  it('掲載される部屋だけを母数にできる', () => {
    const records = [施設({ 部屋: [{ 部屋名: '大ホール', 客席数: 800 }, { 部屋名: '会議室' }] })]
    expect(row(fieldCoverage({ file: 'concerthall', records }), '客席数').母数).toBe(2)
    const 掲載のみ = fieldCoverage({
      file: 'concerthall',
      records,
      rooms: [{ 部屋名: '大ホール', 客席数: 800 }],
    })
    expect(row(掲載のみ, '客席数')).toMatchObject({ 記入: 1, 母数: 1, 割合: 100 })
  })

  it('練習場は練習場の項目を数える', () => {
    const result = fieldCoverage({ file: 'practice', records: [施設({ 部屋: [{ 定員: 20 }] })] })
    expect(row(result, '定員').記入).toBe(1)
    expect(row(result, '客席数')).toBeUndefined()
  })

  it('知らないファイルでは部屋の項目を数えない', () => {
    const result = fieldCoverage({ file: 'unknown', records: [施設()] })
    expect(result.rows.every(r => r.単位 === '施設')).toBe(true)
  })
})

describe('lastCheckedOn', () => {
  it('出典が無ければ undefined', () => {
    expect(lastCheckedOn(施設())).toBeUndefined()
    expect(lastCheckedOn(施設({ 出典: [{ URL: 'https://example.com' }] }))).toBeUndefined()
  })

  it('最も新しい確認日を返す', () => {
    const r = 施設({ 出典: [{ 確認日: '2024-01-01' }, { 確認日: '2026-03-05' }] })
    expect(lastCheckedOn(r)).toBe('2026-03-05')
  })
})

describe('freshness', () => {
  const today = new Date('2026-09-18')
  const 確認 = 日 => 施設({ 出典: [{ 確認日: 日 }] })

  it('確認日からの経過で振り分ける', () => {
    expect(
      freshness([確認('2026-09-01'), 確認('2025-03-01'), 確認('2023-05-05'), 施設()], today),
    ).toEqual({ 未記録: 1, '1年以内': 1, '1〜2年': 1, '2年以上': 1 })
  })

  it('既定の今日でも動く', () => {
    expect(freshness([施設()])).toMatchObject({ 未記録: 1 })
  })
})

describe('thinnest', () => {
  it('埋まっていない順に返し、母数0の項目は外す', () => {
    const coverages = [
      fieldCoverage({
        file: 'concerthall',
        records: [施設({ URL: 'https://example.com', 部屋: [{ 客席数: 800 }] }), 施設()],
      }),
    ]
    const result = thinnest(coverages, 2)
    expect(result).toHaveLength(2)
    expect(result[0].割合).toBeLessThanOrEqual(result[1].割合)
    expect(result.every(r => r.母数 > 0)).toBe(true)
  })
})

describe('reportCoverage', () => {
  const datasets = [
    { file: 'concerthall', records: [施設({ URL: 'https://example.com', 部屋: [{ 客席数: 8 }] })] },
  ]

  it('既定では1行に畳む', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    reportCoverage(datasets, { today: new Date('2026-09-18') })
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toMatch(/調査: 出典なし 1件/)
    log.mockRestore()
  })

  it('--coverage では項目別に出す', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    reportCoverage(datasets, { detailed: true, today: new Date('2026-09-18') })
    const 出力 = log.mock.calls.map(c => c[0]).join('\n')
    expect(出力).toMatch(/ホール種別/)
    expect(出力).toMatch(/確認日の鮮度/)
    log.mockRestore()
  })

  it('既定の今日でも動く', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    reportCoverage(datasets)
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})
