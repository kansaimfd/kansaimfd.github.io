import { describe, expect, it } from 'vitest'
import {
  fillWalkMinutes,
  flattenHalls,
  isMusicRoom,
  normalize,
  withLastVerified,
} from './transform.mjs'

describe('fillWalkMinutes', () => {
  // 公正競争規約: 道路距離80mにつき徒歩1分、端数切り上げ
  it('駅距離しかなければ徒歩分数を補完する', () => {
    expect(fillWalkMinutes([{ 駅: '大阪駅', 駅距離: 450 }])).toEqual([
      { 駅: '大阪駅', 駅距離: 450, 駅徒歩: 6, 駅徒歩推定: true },
    ])
  })

  it('端数は切り上げる', () => {
    const walk = d => fillWalkMinutes([{ 駅距離: d }])[0].駅徒歩
    expect(walk(80)).toBe(1)
    expect(walk(81)).toBe(2)
    expect(walk(160)).toBe(2)
  })

  // 公式が徒歩分数を書いているなら、それが一次情報
  it('駅徒歩が書かれていれば触らない', () => {
    const 駅 = { 駅: '大阪駅', 駅徒歩: 10, 駅距離: 450 }
    expect(fillWalkMinutes([駅])).toEqual([駅])
  })

  it('補完した値には推定の印を付ける', () => {
    expect(fillWalkMinutes([{ 駅距離: 450 }])[0].駅徒歩推定).toBe(true)
    expect(fillWalkMinutes([{ 駅徒歩: 6 }])[0].駅徒歩推定).toBeUndefined()
  })

  // 逆方向（徒歩→距離）は切り上げのぶん偽の精度になるので補完しない
  it('徒歩分数から距離は補完しない', () => {
    expect(fillWalkMinutes([{ 駅徒歩: 6 }])[0].駅距離).toBeUndefined()
  })

  it('どちらも分からなければそのまま', () => {
    expect(fillWalkMinutes([{ 駅: '大阪駅' }])).toEqual([{ 駅: '大阪駅' }])
  })

  // YAML の書き損じで配列でない値が来ても、検査がエラーとして報告するまで落とさない
  it('配列でなければそのまま返す', () => {
    expect(fillWalkMinutes(undefined)).toBeUndefined()
    expect(fillWalkMinutes('大阪駅')).toBe('大阪駅')
  })
})

describe('isMusicRoom', () => {
  it('音楽設備があれば部屋名によらず残す', () => {
    expect(isMusicRoom({ 部屋名: '会議室', ピアノ有無: true })).toBe(true)
  })

  // 「楽器演奏は不可」の記録がそのまま掲載理由になるのはおかしい
  it('false は音楽用の手掛かりにしない', () => {
    expect(isMusicRoom({ 部屋名: '調理室', 管楽器: false, 打楽器: false })).toBe(false)
  })

  it('客席数や舞台寸法があればホールとみなす', () => {
    expect(isMusicRoom({ 部屋名: '大集会室', 客席数: 500 })).toBe(true)
  })

  // 単一の部屋では部屋名を省略できるので、名前が無い部屋が実際に来る
  it('部屋名も設備も無ければ落とす', () => {
    expect(isMusicRoom({})).toBe(false)
  })

  it('設備が未調査でも部屋名が音楽用なら残す', () => {
    expect(isMusicRoom({ 部屋名: '音楽練習室' })).toBe(true)
    expect(isMusicRoom({ 部屋名: '第1スタジオ' })).toBe(true)
  })

  it('音楽に使えない部屋は落とす', () => {
    expect(isMusicRoom({ 部屋名: '会議室A' })).toBe(false)
    expect(isMusicRoom({ 部屋名: '和室' })).toBe(false)
  })

  // 「ホール」を含んでも演奏には使わない部屋がある
  it('エントランスホールや控室は名前だけでは残さない', () => {
    expect(isMusicRoom({ 部屋名: 'エントランスホール' })).toBe(false)
    expect(isMusicRoom({ 部屋名: '楽屋控室' })).toBe(false)
  })

  it('展示ホールでも音楽設備があれば残す', () => {
    expect(isMusicRoom({ 部屋名: '展示ホール', ピアノ有無: true })).toBe(true)
  })
})

describe('withLastVerified', () => {
  it('出典の確認日のうち最新を 最終確認日 にする', () => {
    const f = withLastVerified({
      出典: [
        { URL: 'https://example.com/a', 確認日: '2025-01-10' },
        { URL: 'https://example.com/b', 確認日: '2025-06-02' },
        { URL: 'https://example.com/c', 確認日: '2024-12-31' },
      ],
    })
    expect(f.最終確認日).toBe('2025-06-02')
  })

  // 未記録を「確認済み」に見せないため、キーごと付けない
  it('出典がなければ 最終確認日 を持たせない', () => {
    expect(withLastVerified({ 施設名: 'テストホール' })).not.toHaveProperty('最終確認日')
  })
})

describe('flattenHalls', () => {
  it('施設 × ホール に平坦化し、施設属性を各ホールへ配る', () => {
    const halls = flattenHalls([
      {
        ID: 10,
        施設名: 'テスト文化会館',
        都道府県: '大阪府',
        部屋: [
          { 部屋名: '大ホール', 客席数: 1500 },
          { 部屋名: '小ホール', 客席数: 300 },
        ],
      },
    ])
    expect(halls).toHaveLength(2)
    expect(halls[0]).toMatchObject({
      ID: 10,
      施設名: 'テスト文化会館',
      都道府県: '大阪府',
      客席数: 1500,
    })
    expect(halls.map(h => h.キー)).toEqual(['10-大ホール', '10-小ホール'])
  })

  it('平坦化した結果に 部屋 は残さない', () => {
    const [hall] = flattenHalls([{ ID: 10, 部屋: [{ 部屋名: '大ホール' }] }])
    expect(hall).not.toHaveProperty('部屋')
  })

  // 出典は施設あたり最大5KB。ホールの数だけ複製すると一覧の転送量を無駄に増やす
  it('詳細ページでしか使わない 出典・最終確認日 は載せない', () => {
    const [hall] = flattenHalls([
      {
        ID: 10,
        施設名: 'テスト文化会館',
        出典: [{ URL: 'https://example.com', 確認日: '2026-01-01' }],
        最終確認日: '2026-01-01',
        部屋: [{ 部屋名: '大ホール' }],
      },
    ])
    expect(hall).not.toHaveProperty('出典')
    expect(hall).not.toHaveProperty('最終確認日')
    expect(hall.施設名).toBe('テスト文化会館')
  })

  // 落とすのは平坦化した一覧だけ。渡された施設オブジェクトには触らない
  it('元の施設オブジェクトからは 出典 を消さない', () => {
    const facility = { ID: 10, 出典: [{ URL: 'https://example.com' }], 部屋: [{}] }
    flattenHalls([facility])
    expect(facility.出典).toHaveLength(1)
  })

  // 部屋が未登録の施設も一覧から消えないようにする
  it('部屋が未登録でも1件は出す', () => {
    expect(flattenHalls([{ ID: 20, 施設名: 'テストホール' }])).toEqual([
      { ID: 20, 施設名: 'テストホール', キー: '20-0' },
    ])
    expect(flattenHalls([{ ID: 20, 部屋: [] }])).toHaveLength(1)
  })

  it('部屋名がなくても添字でキーを作る', () => {
    expect(flattenHalls([{ ID: 30, 部屋: [{ 客席数: 800 }] }])[0].キー).toBe('30-0')
  })
})

describe('normalize', () => {
  it('駅徒歩の補完と音楽外の部屋の除外をまとめて行う', () => {
    const f = normalize({
      ID: 10,
      施設名: 'テスト市民会館',
      最寄駅: [{ 駅: '大阪駅', 駅距離: 450 }],
      部屋: [{ 部屋名: '音楽室' }, { 部屋名: '調理室' }],
      出典: [{ URL: 'https://example.com', 確認日: '2025-06-02' }],
    })
    expect(f.最寄駅[0].駅徒歩).toBe(6)
    expect(f.部屋.map(r => r.部屋名)).toEqual(['音楽室'])
    expect(f.最終確認日).toBe('2025-06-02')
  })

  it('最寄駅も部屋も未登録の施設をそのまま通す', () => {
    const f = { ID: 10, 施設名: 'テストホール' }
    expect(normalize(f)).toEqual(f)
  })
})
