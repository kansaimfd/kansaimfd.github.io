import { describe, expect, it } from 'vitest'
import type { PracticeListItem } from './types'
import {
  facilityState,
  filterPractices,
  maxArea,
  maxCapacity,
  practiceStateFromParams,
  practiceStateToParams,
  sortPractices,
  type PracticeCriteria,
} from './practice'

/** 絞り込みに関係しない必須項目を埋めた土台 */
function practice(overrides: Partial<PracticeListItem> & { ID: number }): PracticeListItem {
  return {
    施設名: `練習場${overrides.ID}`,
    都道府県: '大阪府',
    市区町村: '大阪市北区',
    番地以下: '1-1',
    経度: 135,
    緯度: 34.7,
    ...overrides,
  }
}

const NO_CRITERIA: PracticeCriteria = {
  query: '',
  prefs: [],
  city: '',
  capacity: '',
  station: '',
  walk: '',
  equip: new Set(),
}

const criteria = (over: Partial<PracticeCriteria>): PracticeCriteria => ({
  ...NO_CRITERIA,
  ...over,
})

describe('facilityState', () => {
  // どこかの部屋で使えるなら施設として使える（その部屋を借りればよい）
  it('1つでも true があれば true', () => {
    expect(facilityState([undefined, false, true])).toBe(true)
  })

  it('true が無く false があれば false', () => {
    expect(facilityState([undefined, false])).toBe(false)
  })

  // 手がかりが1つも無い状態を false（なし）にすると、未調査が「なし」に化ける
  it('手がかりが無ければ未調査', () => {
    expect(facilityState([])).toBeUndefined()
    expect(facilityState([undefined, undefined])).toBeUndefined()
  })
})

describe('maxCapacity / maxArea', () => {
  it('最も大きい部屋の値を返す', () => {
    const p = practice({ ID: 10, 部屋: [{ 定員: 20, 面積: 30 }, { 定員: 50 }, { 面積: 80 }] })
    expect(maxCapacity(p)).toBe(50)
    expect(maxArea(p)).toBe(80)
  })

  it('部屋が無ければ 0', () => {
    expect(maxCapacity(practice({ ID: 10 }))).toBe(0)
    expect(maxArea(practice({ ID: 10, 部屋: [] }))).toBe(0)
  })

  it('値の無い部屋しか無ければ 0', () => {
    expect(maxCapacity(practice({ ID: 10, 部屋: [{}] }))).toBe(0)
  })
})

describe('filterPractices', () => {
  it('条件が空なら全件そのまま', () => {
    const list = [practice({ ID: 10 }), practice({ ID: 20 })]
    expect(filterPractices(list, NO_CRITERIA).filtered).toEqual(list)
  })

  // 「30名で使えるか」は部屋単位の話。最大の部屋で足りれば候補に残す
  it('定員は最も大きい部屋で判断する', () => {
    const list = [
      practice({ ID: 10, 部屋: [{ 定員: 10 }, { 定員: 40 }] }),
      practice({ ID: 20, 部屋: [{ 定員: 10 }, { 定員: 20 }] }),
    ]
    expect(filterPractices(list, criteria({ capacity: '30' })).filtered.map(p => p.ID)).toEqual([
      10,
    ])
  })

  it('最寄駅は名前で当てる', () => {
    const list = [
      practice({ ID: 10, 最寄駅: [{ 駅: '梅田駅' }, { 駅: '中崎町駅' }] }),
      practice({ ID: 20, 最寄駅: [{ 駅: '心斎橋駅' }] }),
    ]
    expect(
      filterPractices(list, criteria({ station: '中崎町駅' })).filtered.map(p => p.ID),
    ).toEqual([10])
  })

  it('徒歩は最も近い駅で判断し、指定した分数は含む', () => {
    const list = [
      practice({
        ID: 10,
        最寄駅: [
          { 駅: 'A駅', 駅徒歩: 15 },
          { 駅: 'B駅', 駅徒歩: 5 },
        ],
      }),
      practice({ ID: 20, 最寄駅: [{ 駅: 'C駅', 駅徒歩: 10 }] }),
      practice({ ID: 30 }), // 最寄駅の記録なし
    ]
    expect(filterPractices(list, criteria({ walk: '10' })).filtered.map(p => p.ID)).toEqual([
      10, 20,
    ])
  })

  it('府県を絞ると市区町村も併用できる', () => {
    const list = [
      practice({ ID: 10, 都道府県: '大阪府', 市区町村: '大阪市北区' }),
      practice({ ID: 20, 都道府県: '大阪府', 市区町村: '堺市堺区' }),
      practice({ ID: 30, 都道府県: '京都府', 市区町村: '京都市中京区' }),
    ]
    const { filtered } = filterPractices(list, criteria({ prefs: ['大阪府'], city: '大阪市北区' }))
    expect(filtered.map(p => p.ID)).toEqual([10])
  })

  describe('フリーワード', () => {
    const list = [
      practice({ ID: 10, 施設名: '西宮市民会館', 市区町村: '西宮市' }),
      practice({ ID: 20, 施設名: 'RHY梅田', 市区町村: '大阪市北区' }),
    ]

    it('施設名で当たる', () => {
      expect(
        filterPractices(list, criteria({ query: '市民会館' })).filtered.map(p => p.ID),
      ).toEqual([10])
    })

    it('住所でも当たり、英字の大文字小文字は問わない', () => {
      expect(filterPractices(list, criteria({ query: '北区' })).filtered.map(p => p.ID)).toEqual([
        20,
      ])
      expect(filterPractices(list, criteria({ query: 'rhy' })).filtered.map(p => p.ID)).toEqual([
        20,
      ])
    })
  })

  describe('設備と未調査の開示', () => {
    it('施設レベルの貸出備品も手がかりにする', () => {
      // 受付で申し込む貸出ピアノで、置かれる部屋が公式に書かれていない施設がある
      const list = [practice({ ID: 10, ピアノ有無: true, 部屋: [{}] })]
      expect(filterPractices(list, criteria({ equip: new Set(['piano']) })).filtered).toHaveLength(
        1,
      )
    })

    it('どこかの部屋で使えれば残す', () => {
      const list = [practice({ ID: 10, 部屋: [{ 管楽器: false }, { 管楽器: true }] })]
      expect(filterPractices(list, criteria({ equip: new Set(['wind']) })).filtered).toHaveLength(1)
    })

    /**
     * 未調査のせいで外れた件数は必ず数える。
     * 練習場は管楽器・打楽器の記録が3割弱しかないので、ここを黙って消すと影響が大きい
     */
    it('未調査で外れた件数を数える（「なし」は数えない）', () => {
      const list = [
        practice({ ID: 10, 部屋: [{ 管楽器: true }] }),
        practice({ ID: 20, 部屋: [{ 管楽器: false }] }),
        practice({ ID: 30, 部屋: [{}] }),
        practice({ ID: 40 }),
      ]
      const { filtered, unknownExcluded, unknownFields } = filterPractices(
        list,
        criteria({ equip: new Set(['wind']) }),
      )
      expect(filtered.map(p => p.ID)).toEqual([10])
      expect(unknownExcluded).toBe(2)
      expect(unknownFields).toEqual(['管楽器の可否'])
    })

    /**
     * **未調査で外れるのは設備だけではない。** 定員は283室中193室、
     * 徒歩分数も駅の記録が無い施設がある。以前はどちらも黙って消えていた
     */
    it('定員・最寄駅・徒歩の未調査も数える', () => {
      const list = [
        practice({ ID: 10, 部屋: [{ 定員: 50 }] }),
        practice({ ID: 20, 部屋: [{ 定員: 10 }] }), // 足りないので「合わない」
        practice({ ID: 30, 部屋: [{}] }), // 定員が未調査
        practice({ ID: 40 }), // 部屋そのものが未登録
      ]
      const { filtered, unknownExcluded, unknownFields } = filterPractices(
        list,
        criteria({ capacity: '30' }),
      )
      expect(filtered.map(p => p.ID)).toEqual([10])
      expect(unknownExcluded).toBe(2)
      expect(unknownFields).toEqual(['定員'])
    })

    it('最寄駅の記録が無い施設は、駅や徒歩で絞ると未調査として数える', () => {
      const list = [
        practice({ ID: 10, 最寄駅: [{ 駅: '梅田駅', 駅徒歩: 5 }] }),
        practice({ ID: 20 }), // 最寄駅の記録なし
      ]

      const byStation = filterPractices(list, criteria({ station: '梅田駅' }))
      expect(byStation.filtered.map(p => p.ID)).toEqual([10])
      expect(byStation.unknownExcluded).toBe(1)
      expect(byStation.unknownFields).toEqual(['最寄駅'])

      const byWalk = filterPractices(list, criteria({ walk: '10' }))
      expect(byWalk.filtered.map(p => p.ID)).toEqual([10])
      expect(byWalk.unknownExcluded).toBe(1)
      expect(byWalk.unknownFields).toEqual(['駅徒歩'])
    })

    /** 定員0の部屋と、定員が未調査の部屋を同じに扱わない */
    it('定員が未調査の施設は「定員0」として扱わない', () => {
      const list = [practice({ ID: 10, 部屋: [{ 面積: 30 }] })]
      const { unknownExcluded, unknownFields } = filterPractices(list, criteria({ capacity: '1' }))
      expect(unknownExcluded).toBe(1)
      expect(unknownFields).toEqual(['定員'])
    })
  })
})

describe('sortPractices', () => {
  it('施設名は五十音順', () => {
    const list = [
      practice({ ID: 10, 施設名: '西宮市民会館', 施設名かな: 'にしのみやしみんかいかん' }),
      practice({ ID: 20, 施設名: '朝日ホール', 施設名かな: 'あさひほーる' }),
    ]
    expect(sortPractices(list, '施設名', true).map(p => p.ID)).toEqual([20, 10])
  })

  it('最寄駅の近い順に並べ、記録の無い施設は最後に来る', () => {
    const list = [
      practice({ ID: 10 }),
      practice({ ID: 20, 最寄駅: [{ 駅: 'A駅', 駅徒歩: 12 }] }),
      practice({ ID: 30, 最寄駅: [{ 駅: 'B駅', 駅徒歩: 3 }] }),
    ]
    expect(sortPractices(list, '最寄駅徒歩', true).map(p => p.ID)).toEqual([30, 20, 10])
  })

  // 同値のときに順序を入れ替えると、絞り込みを変えるたびに一覧が跳ねる
  it('同じ値どうしは元の順序のまま', () => {
    const list = [practice({ ID: 10 }), practice({ ID: 20 }), practice({ ID: 30 })]
    expect(sortPractices(list, '都道府県', true).map(p => p.ID)).toEqual([10, 20, 30])
  })

  it('降順は昇順の逆順', () => {
    const list = [
      practice({ ID: 10, 最寄駅: [{ 駅: 'A駅', 駅徒歩: 3 }] }),
      practice({ ID: 20, 最寄駅: [{ 駅: 'B駅', 駅徒歩: 12 }] }),
    ]
    expect(sortPractices(list, '最寄駅徒歩', false).map(p => p.ID)).toEqual([20, 10])
  })

  it('元の配列は並べ替えない', () => {
    const list = [practice({ ID: 20, 都道府県: '京都府' }), practice({ ID: 10 })]
    sortPractices(list, '都道府県', true)
    expect(list.map(p => p.ID)).toEqual([20, 10])
  })
})

describe('URLとの往復', () => {
  it('何も絞り込んでいなければクエリは空', () => {
    const state = practiceStateFromParams(new URLSearchParams(''))
    expect(practiceStateToParams(state).toString()).toBe('')
  })

  it('条件をひととおり載せて読み戻せる', () => {
    const params = practiceStateToParams({
      query: 'スタジオ',
      prefs: ['京都府'],
      city: '京都市中京区',
      capacity: '50',
      station: '烏丸駅',
      walk: '10',
      equip: new Set(['piano', 'perc']),
      view: 'map',
      sortKey: '最寄駅徒歩',
      sortAsc: true,
    })
    expect(practiceStateFromParams(params)).toEqual({
      query: 'スタジオ',
      prefs: ['京都府'],
      city: '京都市中京区',
      capacity: '50',
      station: '烏丸駅',
      walk: '10',
      equip: new Set(['piano', 'perc']),
      view: 'map',
      sortKey: '最寄駅徒歩',
      sortAsc: true,
    })
  })
})
