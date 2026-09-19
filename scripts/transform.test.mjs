import { describe, expect, it } from 'vitest'
import {
  fillWalkMinutes,
  flattenHalls,
  toPracticeList,
  toHallPracticeList,
  isHallRoom,
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

describe('isHallRoom', () => {
  it.each([
    [{ 部屋名: 'リハーサル室', 客席数: 100 }, '客席数がある'],
    [{ 部屋名: 'スタジオ', 舞台幅: 10 }, '舞台がある'],
    [{ 部屋名: '音楽室', ホール種別: '小ホール・サロン' }, 'ホール種別がある'],
    [{ 部屋名: '練習室', パイプオルガン: true }, 'パイプオルガンがある'],
    [{ 部屋名: '小ホール' }, '設備が未調査でも名前がホール'],
    [{}, '部屋名の無い単一ホール'],
  ])('%o はホール（%s）', room => {
    expect(isHallRoom(room)).toBe(true)
  })

  it.each([
    { 部屋名: 'リハーサル室', ピアノ有無: true, 定員: 50 },
    { 部屋名: '練習室1' },
    { 部屋名: 'スタジオA', 面積: 80 },
    { 部屋名: 'レセプションホール', ピアノ有無: true, 定員: 120 },
    { 部屋名: '展示ホール', 面積: 177 },
    { 部屋名: 'コンベンションホール', ピアノ有無: true },
  ])('%o はホールではない', room => {
    expect(isHallRoom(room)).toBe(false)
  })
})

describe('toHallPracticeList', () => {
  const facility = {
    ID: 10,
    施設名: 'テスト文化会館',
    都道府県: '大阪府',
    TEL: '06-0000-0000',
    部屋: [
      { 部屋名: '大ホール', 客席数: 1500 },
      { 部屋名: 'リハーサル室', 定員: 80, 面積: 200, ピアノ有無: true, 打楽器: true },
      { 部屋名: '練習室1', 定員: 10 },
    ],
  }

  it('ホールでない部屋だけを練習場の形にし、併設の印を付ける', () => {
    expect(toHallPracticeList([facility])).toEqual([
      {
        ID: 10,
        施設名: 'テスト文化会館',
        都道府県: '大阪府',
        部屋: [{ 定員: 80, 面積: 200, ピアノ有無: true, 打楽器: true }, { 定員: 10 }],
        ホール併設: true,
      },
    ])
  })

  it('ホールしか無い施設は出さない', () => {
    expect(toHallPracticeList([{ ID: 20, 部屋: [{ 部屋名: '大ホール' }] }])).toEqual([])
    expect(toHallPracticeList([{ ID: 30 }])).toEqual([])
  })

  it('全室が貸館を終えていれば、施設としても終えている', () => {
    const [item] = toHallPracticeList([
      {
        ID: 40,
        部屋: [
          { 部屋名: '大ホール', 客席数: 800 },
          { 部屋名: '練習室A', 貸館: { 状態: '終了' } },
          { 部屋名: '練習室B', 貸館: { 状態: '休止' } },
          { 部屋名: '練習室C', 貸館: { 状態: '廃止' } },
        ],
      },
    ])
    // いちばん借りやすい状態を採る（休止は再開がある）
    expect(item.貸館).toEqual({ 状態: '休止' })
  })

  it('1室でも通常どおりなら、施設としては借りられる', () => {
    const [item] = toHallPracticeList([
      {
        ID: 50,
        部屋: [{ 部屋名: '練習室A', 貸館: { 状態: '終了' } }, { 部屋名: '練習室B' }],
      },
    ])
    expect(item.貸館).toBeUndefined()
  })

  it('施設側の貸館はそのまま使う', () => {
    const [item] = toHallPracticeList([
      { ID: 60, 貸館: { 状態: '廃止' }, 部屋: [{ 部屋名: '練習室' }] },
    ])
    expect(item.貸館).toEqual({ 状態: '廃止' })
  })
})

describe('flattenHalls', () => {
  it('ホールでない部屋は一覧に載せない', () => {
    const halls = flattenHalls([
      {
        ID: 10,
        部屋: [
          { 部屋名: '大ホール', 客席数: 1500 },
          { 部屋名: 'リハーサル室', 定員: 80 },
        ],
      },
    ])
    expect(halls.map(h => h.部屋名)).toEqual(['大ホール'])
  })

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

  /**
   * 一覧に載せるフィールドは挙げた側だけ。
   * 出典は施設あたり最大5KBあり、ホールの数だけ複製すると一覧の転送量を無駄に増やす。
   * 料金URL・申込URL・休館日・TEL も一覧では読まない
   */
  it('一覧が読まないフィールドは載せない', () => {
    const [hall] = flattenHalls([
      {
        ID: 10,
        施設名: 'テスト文化会館',
        出典: [{ URL: 'https://example.com', 確認日: '2026-01-01' }],
        最終確認日: '2026-01-01',
        TEL: '06-0000-0000',
        休館日: '月曜',
        申込URL: 'https://example.com/apply',
        料金URL: 'https://example.com/price',
        築年月: '1995-04',
        部屋: [{ 部屋名: '大ホール', 楽屋収容人数: 48, ピアノメーカー: 'スタインウェイ' }],
      },
    ])
    for (const key of [
      '出典',
      '最終確認日',
      'TEL',
      '休館日',
      '申込URL',
      '料金URL',
      '築年月',
      '楽屋収容人数',
      'ピアノメーカー',
    ]) {
      expect(hall).not.toHaveProperty(key)
    }
    expect(hall.施設名).toBe('テスト文化会館')
    expect(hall.部屋名).toBe('大ホール')
  })

  // 値の無いキーで埋めない（undefined を書き出すとJSONが無駄に太る）
  it('値の無いフィールドはキーごと出さない', () => {
    const [hall] = flattenHalls([{ ID: 10, 施設名: 'テストホール', 部屋: [{}] }])
    expect(hall).not.toHaveProperty('建物')
    expect(hall).not.toHaveProperty('客席数')
  })

  // 落とすのは平坦化した一覧だけ。渡された施設オブジェクトには触らない
  it('元の施設オブジェクトからは 出典 を消さない', () => {
    const facility = { ID: 10, 出典: [{ URL: 'https://example.com' }], 部屋: [{}] }
    flattenHalls([facility])
    expect(facility.出典).toHaveLength(1)
  })

  /**
   * あましんアルカイックホールは大ホールが休止・中ホールが営業中・小ホールが終了。
   * 施設側の 貸館 は「全室が対象」の意味なので、部屋側があればそちらが勝つ
   */
  it('部屋の 貸館 が施設の 貸館 を上書きする', () => {
    const halls = flattenHalls([
      {
        ID: 10,
        施設名: 'テスト文化会館',
        貸館: { 状態: '休止', 理由: '改修' },
        部屋: [{ 部屋名: '大ホール' }, { 部屋名: '小ホール', 貸館: { 状態: '終了' } }],
      },
    ])
    expect(halls[0].貸館).toEqual({ 状態: '休止', 理由: '改修' })
    expect(halls[1].貸館).toEqual({ 状態: '終了' })
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

  it('検査除外（データ検査のための記録）は画面用のJSONに出さない', () => {
    const f = normalize({ ID: 10, 施設名: 'テストホール', 検査除外: [{ 警告: 'x', 理由: 'y' }] })
    expect(f).not.toHaveProperty('検査除外')
  })

  it('最寄駅も部屋も未登録の施設をそのまま通す', () => {
    const f = { ID: 10, 施設名: 'テストホール' }
    expect(normalize(f)).toEqual(f)
  })
})

describe('toPracticeList', () => {
  // 一覧と詳細で同じJSONを配っていたころ、練習場しか見ない利用者にも出典が全件届いていた
  it('一覧が読まないフィールドは載せない', () => {
    const [item] = toPracticeList([
      {
        ID: 10,
        施設名: 'テスト練習場',
        都道府県: '大阪府',
        TEL: '06-0000-0000',
        休館日: '月曜',
        申込URL: 'https://example.com/apply',
        出典: [{ URL: 'https://example.com', 確認日: '2026-01-01' }],
        最終確認日: '2026-01-01',
      },
    ])
    for (const key of ['TEL', '休館日', '申込URL', '出典', '最終確認日']) {
      expect(item).not.toHaveProperty(key)
    }
    expect(item).toMatchObject({ ID: 10, 施設名: 'テスト練習場', 都道府県: '大阪府' })
  })

  /**
   * 一覧は部屋を「最大の定員・面積」と「設備の3値」に畳んでしか読まない。
   * 部屋名・楽器制限は詳細ページの表にしか出ない
   */
  it('部屋は一覧が読む項目だけに畳む', () => {
    const [item] = toPracticeList([
      {
        ID: 10,
        施設名: 'テスト練習場',
        部屋: [{ 部屋名: '第1練習室', 定員: 30, 面積: 50, 管楽器: true, 楽器制限: '音量制限あり' }],
      },
    ])
    expect(item.部屋).toEqual([{ 定員: 30, 面積: 50, 管楽器: true }])
  })

  // 部屋が未登録の施設でもキーを生やさない（空配列と未登録は別の意味）
  it('部屋が無ければ 部屋 を持たせない', () => {
    const [item] = toPracticeList([{ ID: 10, 施設名: 'テスト練習場' }])
    expect(item).not.toHaveProperty('部屋')
  })

  // 設備の3値のうち false は「なし」。undefined（未調査）と潰さずに残す
  it('設備の false は残す', () => {
    const [item] = toPracticeList([{ ID: 10, 部屋: [{ 打楽器: false }] }])
    expect(item.部屋).toEqual([{ 打楽器: false }])
  })
})
