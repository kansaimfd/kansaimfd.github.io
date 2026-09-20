import { describe, expect, it } from 'vitest'
import type { ConcertHall } from './types'
import {
  EMPTY_HALL_CRITERIA,
  HALL_EQUIP_FIELDS,
  dedupeByFacility,
  filterHalls,
  groupByFacility,
  rentalVariesByHall,
  hallStateFromParams,
  hallStateToParams,
  sortHalls,
  type HallCriteria,
  type HallPageState,
} from './concerthall'

/** 絞り込みに関係しない必須項目を埋めた土台 */
function hall(overrides: Partial<ConcertHall> & { ID: number }): ConcertHall {
  return {
    施設名: `ホール${overrides.ID}`,
    都道府県: '大阪府',
    市区町村: '大阪市北区',
    番地以下: '1-1',
    経度: 135,
    緯度: 34.7,
    キー: `${overrides.ID}-0`,
    ...overrides,
  }
}

// 画面の「条件をすべて解除」が戻す先と同じものを使う。
// 別に書くと、条件が増えたときにどちらかが古くなる
const NO_CRITERIA: HallCriteria = EMPTY_HALL_CRITERIA

const criteria = (over: Partial<HallCriteria>): HallCriteria => ({ ...NO_CRITERIA, ...over })

describe('filterHalls', () => {
  it('条件が空なら全件そのまま', () => {
    const halls = [hall({ ID: 10 }), hall({ ID: 20 })]
    expect(filterHalls(halls, NO_CRITERIA).filtered).toEqual(halls)
  })

  it('貸館を終えたものは、表示を選んだときだけ出す', () => {
    const halls = [
      hall({ ID: 10 }),
      hall({ ID: 20, 貸館: { 状態: '終了' } }),
      hall({ ID: 30, 貸館: { 状態: '廃止' } }),
      // 休止は再開を待つ人がいる。予定はまだ借りられる。どちらも隠さない
      hall({ ID: 40, 貸館: { 状態: '休止' } }),
      hall({ ID: 50, 貸館: { 状態: '予定' } }),
    ]
    expect(filterHalls(halls, NO_CRITERIA).filtered.map(h => h.ID)).toEqual([10, 40, 50])
    const shown = filterHalls(halls, criteria({ showClosed: true }))
    expect(shown.filtered.map(h => h.ID)).toEqual([10, 20, 30, 40, 50])
    // 隠したのは状態が分かっているからで、未調査のせいではない
    expect(filterHalls(halls, NO_CRITERIA).unknownCount).toBe(0)
  })

  // 練習場一覧にはあったのにコンサートホール側だけ無かった条件（要求仕様にもあった）
  it('市区町村で絞り込める', () => {
    const halls = [
      hall({ ID: 10, 市区町村: '大阪市北区' }),
      hall({ ID: 20, 市区町村: '大阪市中央区' }),
    ]
    expect(filterHalls(halls, criteria({ city: '大阪市北区' })).filtered.map(h => h.ID)).toEqual([
      10,
    ])
  })

  it('最寄駅で絞り込み、駅の記録が無いものは未調査として数える', () => {
    const halls = [
      hall({ ID: 10, 最寄駅: [{ 駅: '大阪城公園駅', 駅徒歩: 5 }] }),
      hall({ ID: 20, 最寄駅: [{ 駅: '西梅田駅', 駅徒歩: 3 }] }),
      hall({ ID: 30 }),
    ]
    const result = filterHalls(halls, criteria({ station: '大阪城公園駅' }))
    expect(result.filtered.map(h => h.ID)).toEqual([10])
    expect(result.unknownCount).toBe(1)
    expect(result.unknownFields).toEqual(['最寄駅'])
  })

  it('徒歩◯分以内で絞り込み、分数が未調査のものは開示する', () => {
    const halls = [
      hall({ ID: 10, 最寄駅: [{ 駅: 'A駅', 駅徒歩: 5 }] }),
      hall({ ID: 20, 最寄駅: [{ 駅: 'B駅', 駅徒歩: 15 }] }),
      // 駅はあるが分数が分からない。「10分より遠い」とは言えない
      hall({ ID: 30, 最寄駅: [{ 駅: 'C駅' }] }),
    ]
    const result = filterHalls(halls, criteria({ walk: '10' }))
    expect(result.filtered.map(h => h.ID)).toEqual([10])
    expect(result.unknownCount).toBe(1)
    expect(result.unknownFields).toEqual(['駅徒歩'])
  })

  it('府県は選んだもののどれかに当たれば残す', () => {
    const halls = [
      hall({ ID: 10, 都道府県: '大阪府' }),
      hall({ ID: 20, 都道府県: '京都府' }),
      hall({ ID: 30, 都道府県: '兵庫県' }),
    ]
    const { filtered } = filterHalls(halls, criteria({ prefs: ['大阪府', '兵庫県'] }))
    expect(filtered.map(h => h.ID)).toEqual([10, 30])
  })

  // ホール種別が未調査の施設は、種別で絞った時点で外れる
  it('ホール種別が未調査なら種別の絞り込みから外れる', () => {
    const halls = [hall({ ID: 10, ホール種別: '音楽専用' }), hall({ ID: 20 })]
    const { filtered } = filterHalls(halls, criteria({ hallTypes: ['音楽専用'] }))
    expect(filtered.map(h => h.ID)).toEqual([10])
  })

  describe('数値の範囲', () => {
    const halls = [
      hall({ ID: 10, 客席数: 300 }),
      hall({ ID: 20, 客席数: 1000 }),
      hall({ ID: 30, 客席数: 2000 }),
      hall({ ID: 40 }), // 未調査
    ]

    it('下限だけを指定できる', () => {
      expect(filterHalls(halls, criteria({ seats: ['1000', ''] })).filtered.map(h => h.ID)).toEqual(
        [20, 30],
      )
    })

    it('上限だけを指定できる', () => {
      expect(filterHalls(halls, criteria({ seats: ['', '1000'] })).filtered.map(h => h.ID)).toEqual(
        [10, 20],
      )
    })

    it('境界の値は含む', () => {
      expect(
        filterHalls(halls, criteria({ seats: ['1000', '1000'] })).filtered.map(h => h.ID),
      ).toEqual([20])
    })

    // 客席数と同じ扱いを舞台寸法にもする（別々に書いたときに片方だけ抜けやすい）
    it('舞台幅・舞台奥行にも同じ範囲指定が効く', () => {
      const staged = [
        hall({ ID: 10, 舞台幅: 20, 舞台奥行: 14 }),
        hall({ ID: 20, 舞台幅: 10, 舞台奥行: 8 }),
        hall({ ID: 30 }),
      ]
      expect(filterHalls(staged, criteria({ stageW: ['15', ''] })).filtered.map(h => h.ID)).toEqual(
        [10],
      )
      expect(filterHalls(staged, criteria({ stageD: ['', '10'] })).filtered.map(h => h.ID)).toEqual(
        [20],
      )
    })

    // 「300席以上」で客席数を調べていない施設が混ざると、条件の意味が無くなる
    it('客席数が未調査の施設は範囲の絞り込みから外れる', () => {
      expect(filterHalls(halls, criteria({ seats: ['1', ''] })).filtered.map(h => h.ID)).toEqual([
        10, 20, 30,
      ])
    })
  })

  describe('フリーワード', () => {
    const halls = [
      hall({ ID: 10, 施設名: 'いずみホール', 市区町村: '大阪市中央区' }),
      hall({ ID: 20, 施設名: 'ザ・シンフォニーホール', 部屋名: '大ホール' }),
      hall({ ID: 30, 施設名: 'Hall ABC' }),
    ]

    it('施設名で当たる', () => {
      expect(filterHalls(halls, criteria({ query: 'いずみ' })).filtered.map(h => h.ID)).toEqual([
        10,
      ])
    })

    it('部屋名でも当たる', () => {
      expect(filterHalls(halls, criteria({ query: '大ホール' })).filtered.map(h => h.ID)).toEqual([
        20,
      ])
    })

    it('住所でも当たる', () => {
      expect(filterHalls(halls, criteria({ query: '中央区' })).filtered.map(h => h.ID)).toEqual([
        10,
      ])
    })

    // 施設名に英字のものがある（KOKO PLAZA・7th Note）ので大文字小文字は問わない
    it('英字の大文字小文字は問わない', () => {
      expect(filterHalls(halls, criteria({ query: 'hall abc' })).filtered.map(h => h.ID)).toEqual([
        30,
      ])
    })

    /** 漢字を含む施設名は、読みで打っても当たらないと探せない */
    it('施設名かなでも当たる', () => {
      const halls = [
        hall({
          ID: 10,
          施設名: '兵庫県立芸術文化センター',
          施設名かな: 'ひょうごけんりつげいじゅつぶんかせんたー',
        }),
        hall({ ID: 20, 施設名: 'いずみホール', 施設名かな: 'いずみほーる' }),
      ]
      expect(filterHalls(halls, criteria({ query: 'げいじゅつ' })).filtered.map(h => h.ID)).toEqual(
        [10],
      )
    })

    /** 施設名かなはひらがなで書く決まりなので、カタカナで打った人を落とさない */
    it('ひらがなとカタカナの違いを吸収する', () => {
      const halls = [hall({ ID: 10, 施設名: 'いずみホール', 施設名かな: 'いずみほーる' })]
      expect(filterHalls(halls, criteria({ query: 'イズミ' })).filtered.map(h => h.ID)).toEqual([
        10,
      ])
    })

    /**
     * 駅名で探す人は多いが、住所の地名と駅名は一致するとは限らない
     * （フェスティバルホールの住所は中之島で、最寄駅は大阪梅田駅）
     */
    it('最寄駅の名前でも当たる', () => {
      const halls = [
        hall({ ID: 10, 市区町村: '大阪市北区', 最寄駅: [{ 駅: '大阪梅田駅' }] }),
        hall({ ID: 20, 市区町村: '大阪市中央区', 最寄駅: [{ 駅: '心斎橋駅' }] }),
      ]
      expect(filterHalls(halls, criteria({ query: '梅田' })).filtered.map(h => h.ID)).toEqual([10])
    })

    /** 「JR」で何百件も当たると絞り込みとして働かない */
    it('路線名では当てない', () => {
      const halls = [hall({ ID: 10, 最寄駅: [{ 路線: ['JR神戸線'], 駅: '三ノ宮駅' }] })]
      expect(filterHalls(halls, criteria({ query: 'JR神戸線' })).filtered).toEqual([])
    })
  })

  describe('設備と未調査の開示', () => {
    const halls = [
      hall({ ID: 10, ピアノ有無: true }),
      hall({ ID: 20, ピアノ有無: false }),
      hall({ ID: 30 }), // 未調査
    ]

    it('残すのは true だけ', () => {
      const { filtered } = filterHalls(halls, criteria({ equip: new Set(['piano']) }))
      expect(filtered.map(h => h.ID)).toEqual([10])
    })

    /**
     * 未調査のせいで外れた件数は必ず数える。黙って消すと、
     * 実際にはピアノがある施設を利用者が見落とす
     */
    it('未調査で外れた件数を数える（「なし」は数えない）', () => {
      const { unknownCount, unknownFields } = filterHalls(
        halls,
        criteria({ equip: new Set(['piano']) }),
      )
      expect(unknownCount).toBe(1)
      // 注意書きに出す名前。何が未調査だったのかを利用者に示す
      expect(unknownFields).toEqual(['ピアノの有無'])
    })

    it('設備で絞っていなければ 0 件', () => {
      expect(filterHalls(halls, NO_CRITERIA).unknownCount).toBe(0)
    })

    /**
     * **未調査で外れるのは設備だけではない。** 客席数は一覧のホールの1割ほどに
     * 入っていないので、客席数で絞るとそれらが外れる。これを数えずに
     * 消していたため、利用者には結果が少ない理由が分からなかった
     */
    it('数値の条件でも未調査の件数を数える', () => {
      const halls = [
        hall({ ID: 10, 客席数: 1000 }),
        hall({ ID: 20, 客席数: 100 }), // 少なすぎるので「合わない」
        hall({ ID: 30 }), // 未調査
        hall({ ID: 40 }), // 未調査
      ]
      const { filtered, unknownCount, unknownFields } = filterHalls(
        halls,
        criteria({ seats: ['500', ''] }),
      )
      expect(filtered.map(h => h.ID)).toEqual([10])
      expect(unknownCount).toBe(2)
      expect(unknownFields).toEqual(['客席数'])
    })

    it('ホール種別の未調査も数える', () => {
      const halls = [hall({ ID: 10, ホール種別: '音楽専用' }), hall({ ID: 20 })]
      const { unknownCount, unknownFields } = filterHalls(
        halls,
        criteria({ hallTypes: ['音楽専用'] }),
      )
      expect(unknownCount).toBe(1)
      expect(unknownFields).toEqual(['ホール種別'])
    })

    /** 府県が違うだけの施設まで数えると、除外件数が実態より膨らむ */
    it('他の条件で外れた施設は未調査に数えない', () => {
      const halls = [hall({ ID: 10, 都道府県: '京都府' })] // 客席数は未調査
      const { unknownCount } = filterHalls(
        halls,
        criteria({ prefs: ['大阪府'], seats: ['500', ''] }),
      )
      expect(unknownCount).toBe(0)
    })

    /**
     * 選択肢とデータの結び付けはキーの文字列だけで決まっていて、
     * 取り違えても型チェックに引っかからない（どれも同じ3値を返す）
     */
    it.each([
      ['piano', { ピアノ有無: true }],
      ['organ', { パイプオルガン: true }],
      ['stand', { 譜面台貸出: true }],
      ['family', { 親子室: true }],
      ['parking', { 駐車場: 10 }],
    ])('%s は対応するフィールドを見ている', (key, fields) => {
      const equipped = hall({ ID: 10, ...fields })
      const bare = hall({ ID: 20 })
      const { filtered } = filterHalls([equipped, bare], criteria({ equip: new Set([key]) }))
      expect(filtered.map(h => h.ID)).toEqual([10])
    })

    it('絞り込める設備をすべて選択肢に出している', () => {
      expect(HALL_EQUIP_FIELDS.map(e => e.key)).toEqual([
        'piano',
        'organ',
        'stand',
        'family',
        'parking',
      ])
    })

    it('複数の設備はすべて満たすものだけ残す', () => {
      const halls = [
        hall({ ID: 10, ピアノ有無: true, 親子室: true }),
        hall({ ID: 20, ピアノ有無: true, 親子室: false }),
      ]
      const { filtered } = filterHalls(halls, criteria({ equip: new Set(['piano', 'family']) }))
      expect(filtered.map(h => h.ID)).toEqual([10])
    })

    /**
     * 駐車場は台数で持っているが、記録が無いのは「無い」ではなく「調べていない」。
     * 以前は駐車場だけ別扱いで、台数が未調査の施設が数に入らないまま消えていた
     */
    it('駐車場の未調査も除外件数に数える', () => {
      const halls = [
        hall({ ID: 10, 駐車場: 50 }),
        hall({ ID: 20, 駐車場: 0 }),
        hall({ ID: 30 }), // 未調査
      ]
      const { filtered, unknownCount } = filterHalls(
        halls,
        criteria({ equip: new Set(['parking']) }),
      )
      expect(filtered.map(h => h.ID)).toEqual([10])
      expect(unknownCount).toBe(1)
    })
  })
})

describe('sortHalls', () => {
  // コードポイント順だと 100BAN→7th Note→KOKO PLAZA→アイホール になる。
  // 読みが決まるものを五十音順で先に並べ、ラテン文字の施設名はそのあと（name.ts）
  it('施設名は五十音順で、読みが決まらない名前は後ろにまとめる', () => {
    const halls = [
      hall({ ID: 10, 施設名: 'いずみホール', 施設名かな: 'いずみほーる' }),
      hall({ ID: 20, 施設名: 'KOKO PLAZA' }),
      hall({ ID: 30, 施設名: 'アイホール', 施設名かな: 'あいほーる' }),
    ]
    expect(sortHalls(halls, '施設名', true).map(h => h.施設名)).toEqual([
      'アイホール',
      'いずみホール',
      'KOKO PLAZA',
    ])
  })

  it('都道府県で並べ替えられる', () => {
    const halls = [
      hall({ ID: 10, 都道府県: '兵庫県' }),
      hall({ ID: 20, 都道府県: '京都府' }),
      hall({ ID: 30, 都道府県: '大阪府' }),
    ]
    expect(sortHalls(halls, '都道府県', true).map(h => h.都道府県)).toEqual([
      '京都府',
      '兵庫県',
      '大阪府',
    ])
  })

  // 同値のときに順序を入れ替えると、絞り込みを変えるたびに一覧が跳ねる
  it('同じ値どうしは元の順序のまま', () => {
    const halls = [
      hall({ ID: 10, 都道府県: '大阪府' }),
      hall({ ID: 20, 都道府県: '大阪府' }),
      hall({ ID: 30, 都道府県: '大阪府' }),
    ]
    expect(sortHalls(halls, '都道府県', true).map(h => h.ID)).toEqual([10, 20, 30])
  })

  it('降順は昇順の逆順', () => {
    const halls = [hall({ ID: 10, 客席数: 300 }), hall({ ID: 20, 客席数: 2000 })]
    expect(sortHalls(halls, '客席数', false).map(h => h.ID)).toEqual([20, 10])
  })

  // 調べていない施設が先頭に来ると一覧の意味が壊れる。**向きを変えても同じ**で、
  // 以前は未調査を -1 に均していたため「少ない順」で18ホールが先頭を占めていた
  it('客席数が未調査ならどちらの向きでも最後に来る', () => {
    const halls = [hall({ ID: 10 }), hall({ ID: 20, 客席数: 300 })]
    expect(sortHalls(halls, '客席数', false).map(h => h.ID)).toEqual([20, 10])
    expect(sortHalls(halls, '客席数', true).map(h => h.ID)).toEqual([20, 10])
  })

  // 未調査どうしを比べたときに並びが跳ねないこと
  it('客席数が両方とも未調査なら元の順序のまま', () => {
    const halls = [hall({ ID: 10 }), hall({ ID: 20 })]
    expect(sortHalls(halls, '客席数', false).map(h => h.ID)).toEqual([10, 20])
  })

  it('最寄駅が無い施設は徒歩のどちらの向きでも最後に来る', () => {
    const halls = [hall({ ID: 10 }), hall({ ID: 20, 最寄駅: [{ 駅: 'テスト駅', 駅徒歩: 5 }] })]
    expect(sortHalls(halls, '最寄駅徒歩', true).map(h => h.ID)).toEqual([20, 10])
    // 番兵値（999）で比べていたころは「遠い順」で先頭に来ていた
    expect(sortHalls(halls, '最寄駅徒歩', false).map(h => h.ID)).toEqual([20, 10])
  })

  // Reactの状態として持つ配列を並べ替えてしまうと、再描画の判定が壊れる
  it('元の配列は並べ替えない', () => {
    const halls = [hall({ ID: 20, 客席数: 2000 }), hall({ ID: 10, 客席数: 300 })]
    sortHalls(halls, '客席数', true)
    expect(halls.map(h => h.ID)).toEqual([20, 10])
  })
})

describe('groupByFacility', () => {
  // リストのカードは1施設1枚。大ホールと中ホールが別のカードに並ばないようにする
  it('同じ施設のホールを並び順を保ったまま束ねる', () => {
    const halls = [
      hall({ ID: 10, キー: '10-大ホール' }),
      hall({ ID: 20, キー: '20-0' }),
      hall({ ID: 10, キー: '10-小ホール' }),
    ]
    expect(groupByFacility(halls).map(g => g.map(h => h.キー))).toEqual([
      ['10-大ホール', '10-小ホール'],
      ['20-0'],
    ])
  })
})

describe('rentalVariesByHall', () => {
  it('全ホールが同じ状態なら分かれていない', () => {
    const 休止 = { 状態: '休止' } as const
    expect(rentalVariesByHall([hall({ ID: 10 }), hall({ ID: 10 })])).toBe(false)
    expect(rentalVariesByHall([hall({ ID: 10, 貸館: 休止 }), hall({ ID: 10, 貸館: 休止 })])).toBe(
      false,
    )
  })

  // あましんアルカイックホールは大が休止・中が営業中・小が終了
  it('一部のホールだけ休止していれば分かれている', () => {
    expect(rentalVariesByHall([hall({ ID: 10 }), hall({ ID: 10, 貸館: { 状態: '休止' } })])).toBe(
      true,
    )
  })

  it('空なら分かれていない', () => {
    expect(rentalVariesByHall([])).toBe(false)
  })
})

describe('dedupeByFacility', () => {
  // 一覧は施設×ホールに平坦化してあるので、地図ではピンが同じ座標に重なる
  it('同じ施設のホールは最初の1件にまとめる', () => {
    const halls = [
      hall({ ID: 10, 部屋名: '大ホール', キー: '10-大ホール' }),
      hall({ ID: 10, 部屋名: '小ホール', キー: '10-小ホール' }),
      hall({ ID: 20, キー: '20-0' }),
    ]
    expect(dedupeByFacility(halls).map(h => h.キー)).toEqual(['10-大ホール', '20-0'])
  })
})

/**
 * URLと状態の往復。**URLが一覧の状態の置き場所**なので、
 * ここが崩れると共有したリンクが別の条件で開く。
 */
describe('URLとの往復', () => {
  it('何も絞り込んでいなければクエリは空', () => {
    const state = hallStateFromParams(new URLSearchParams(''))
    expect(hallStateToParams(state).toString()).toBe('')
  })

  it('条件をひととおり載せて読み戻せる', () => {
    const params = hallStateToParams({
      query: 'ホール',
      prefs: ['大阪府', '兵庫県'],
      city: '大阪市北区',
      station: '大阪城公園駅',
      walk: '10',
      hallTypes: ['音楽専用'],
      seats: ['500', '1200'],
      stageW: ['', '20'],
      stageD: ['10', ''],
      equip: new Set(['piano', 'organ']),
      showClosed: true,
      includeUnknown: true,
      view: 'table',
      sortKey: '客席数',
      sortAsc: false,
    })
    expect(hallStateFromParams(params)).toEqual({
      query: 'ホール',
      prefs: ['大阪府', '兵庫県'],
      city: '大阪市北区',
      station: '大阪城公園駅',
      walk: '10',
      hallTypes: ['音楽専用'],
      seats: ['500', '1200'],
      stageW: ['', '20'],
      stageD: ['10', ''],
      equip: new Set(['piano', 'organ']),
      showClosed: true,
      includeUnknown: true,
      view: 'table',
      sortKey: '客席数',
      sortAsc: false,
    })
  })

  /**
   * **読む側と書く側は別々に手で並べてある**ので、片方に足し忘れても
   * 型チェックも lint も通る（条件は効いているのに共有したURLからは消える）。
   * 条件をひとつずつ立てて、URLに載ることと読み戻せることを全項目で確かめる。
   */
  it('絞り込みの全項目がURLを往復する', () => {
    const empty = hallStateFromParams(new URLSearchParams(''))
    const full: HallPageState = {
      ...empty,
      query: 'ホール',
      prefs: ['大阪府'],
      city: '大阪市北区',
      station: '大阪駅',
      walk: '10',
      hallTypes: ['音楽専用'],
      seats: ['500', '1200'],
      stageW: ['5', '20'],
      stageD: ['5', '20'],
      equip: new Set(['piano']),
      showClosed: true,
      includeUnknown: true,
    }
    for (const key of Object.keys(EMPTY_HALL_CRITERIA) as (keyof typeof EMPTY_HALL_CRITERIA)[]) {
      const state = { ...empty, [key]: full[key] }
      const params = hallStateToParams(state)
      expect(params.toString(), `${key} がURLに載っていない`).not.toBe('')
      expect(hallStateFromParams(params), `${key} を読み戻せない`).toEqual(state)
    }
  })

  // 手で書き換えられるので、知らない値は黙って落とす（0件の理由が分からない画面にしない）
  it('知らない府県・種別・設備は落とす', () => {
    const state = hallStateFromParams(new URLSearchParams('pref=東京都&type=野外&equip=karaoke'))
    expect(state.prefs).toEqual([])
    expect(state.hallTypes).toEqual([])
    expect(state.equip.size).toBe(0)
  })
})
