import { describe, expect, it } from 'vitest'
import {
  readFlag,
  writeFlag,
  readList,
  readNumber,
  readRange,
  readSet,
  readSort,
  readText,
  readView,
  writeList,
  writeRange,
  writeSet,
  writeSort,
  writeText,
  writeView,
} from './query'

const params = (s: string) => new URLSearchParams(s)
const PREFS = ['大阪府', '京都府', '兵庫県'] as const
const SORT_KEYS = ['施設名', '客席数'] as const

describe('readText', () => {
  it('無ければ空文字', () => {
    expect(readText(params(''), 'q')).toBe('')
  })

  it('あればそのまま返す', () => {
    expect(readText(params('q=ホール'), 'q')).toBe('ホール')
  })
})

describe('readList', () => {
  it('無ければ空', () => {
    expect(readList(params(''), 'pref', PREFS)).toEqual([])
  })

  // URLは手で書き換えられる。知らない値を絞り込みに渡すと0件の理由が分からなくなる
  it('知らない値は落とす', () => {
    expect(readList(params('pref=大阪府,東京都'), 'pref', PREFS)).toEqual(['大阪府'])
  })

  // 同じ条件なら同じURLになってほしいので、並びは選択肢の側に合わせる
  it('選択肢の並び順に揃え、重複は落とす', () => {
    expect(readList(params('pref=兵庫県,大阪府,大阪府'), 'pref', PREFS)).toEqual([
      '大阪府',
      '兵庫県',
    ])
  })
})

describe('readSet', () => {
  it('知っているキーだけの集合にする', () => {
    expect([...readSet(params('equip=piano,unknown'), 'equip', ['piano', 'organ'])]).toEqual([
      'piano',
    ])
  })
})

describe('readRange', () => {
  it('無ければ両側とも空', () => {
    expect(readRange(params(''), 'seats')).toEqual(['', ''])
  })

  it('両側の指定を読む', () => {
    expect(readRange(params('seats=500-1200'), 'seats')).toEqual(['500', '1200'])
  })

  it('片側だけの指定を読む', () => {
    expect(readRange(params('seats=-1200'), 'seats')).toEqual(['', '1200'])
    expect(readRange(params('seats=500-'), 'seats')).toEqual(['500', ''])
  })

  // 舞台寸法は4割ほどのホールが小数（いずみホールは 19.4×10.5m）。
  // 整数だけにしていたころ、共有されたURLの条件が開いた先で消えていた
  it('小数の指定を読む', () => {
    expect(readRange(params('stagew=16.5-20.8'), 'stagew')).toEqual(['16.5', '20.8'])
    expect(readRange(params('stagew=.5-'), 'stagew')).toEqual(['.5', ''])
  })

  // 一覧の状態はURLが持つので、打鍵ごとにここを通って入力欄へ戻る。
  // 打ちかけを落とすと、小数点を打った時点で欄が空になる
  it('打ちかけの小数点を落とさない', () => {
    expect(readRange(params('stagew=16.-'), 'stagew')).toEqual(['16.', ''])
  })

  // 数として読めないものを渡すと NaN で全件が消える。指定なしに倒す
  it('数として読めない値は指定なしに倒す', () => {
    expect(readRange(params('seats=abc-1.2.3'), 'seats')).toEqual(['', ''])
  })

  // 小数点だけでは比較できない。「指定はあるが判断できない」状態を作らないよう弾く
  it('小数点だけの指定は通さない', () => {
    expect(readRange(params('stagew=.-'), 'stagew')).toEqual(['', ''])
  })
})

describe('readNumber', () => {
  it('0以上の数だけを通す', () => {
    expect(readNumber(params('cap=50'), 'cap')).toBe('50')
    expect(readNumber(params('cap=-3'), 'cap')).toBe('')
    expect(readNumber(params(''), 'cap')).toBe('')
  })
})

describe('readFlag / writeFlag', () => {
  it('1 のときだけオン', () => {
    expect(readFlag(params('closed=1'), 'closed')).toBe(true)
    expect(readFlag(params('closed=true'), 'closed')).toBe(false)
    expect(readFlag(params(''), 'closed')).toBe(false)
  })

  it('オフはURLに載せない', () => {
    const p = params('')
    writeFlag(p, 'closed', false)
    expect(p.toString()).toBe('')
    writeFlag(p, 'closed', true)
    expect(p.toString()).toBe('closed=1')
  })
})

describe('readView', () => {
  it('知っている表示だけを通し、既定はリスト', () => {
    expect(readView(params('view=map'))).toBe('map')
    expect(readView(params('view=gallery'))).toBe('list')
    expect(readView(params(''))).toBe('list')
  })
})

describe('readSort', () => {
  it('キーと向きを読む', () => {
    expect(readSort(params('sort=客席数.desc'), SORT_KEYS, '施設名')).toEqual({
      key: '客席数',
      asc: false,
    })
  })

  it('向きの指定が無ければ昇順', () => {
    expect(readSort(params('sort=客席数'), SORT_KEYS, '施設名')).toEqual({
      key: '客席数',
      asc: true,
    })
  })

  it('知らないキーは既定に倒す', () => {
    expect(readSort(params('sort=築年月.desc'), SORT_KEYS, '施設名')).toEqual({
      key: '施設名',
      asc: true,
    })
    expect(readSort(params(''), SORT_KEYS, '施設名')).toEqual({ key: '施設名', asc: true })
  })
})

/**
 * 書き出し側は**既定値を書かない**。何も絞り込んでいない一覧のURLに
 * `?view=list&sort=施設名.asc` が付いて回ると、条件が付いているように見える。
 */
describe('書き出し', () => {
  const built = (fn: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams()
    fn(p)
    return p.toString()
  }

  it('空の値は書かない', () => {
    expect(built(p => writeText(p, 'q', ''))).toBe('')
    expect(built(p => writeList(p, 'pref', []))).toBe('')
    expect(built(p => writeRange(p, 'seats', ['', '']))).toBe('')
  })

  it('値があれば書く', () => {
    expect(decodeURIComponent(built(p => writeText(p, 'q', 'ホール')))).toBe('q=ホール')
    expect(decodeURIComponent(built(p => writeList(p, 'pref', ['大阪府', '京都府'])))).toBe(
      'pref=大阪府,京都府',
    )
  })

  it('片側だけの範囲も区切りを残して書く', () => {
    expect(built(p => writeRange(p, 'seats', ['500', '']))).toBe('seats=500-')
    expect(built(p => writeRange(p, 'seats', ['', '1200']))).toBe('seats=-1200')
  })

  // 集合は並びが不定なので、選択肢の順に揃える（同じ条件なら同じURLになる）
  it('集合は選択肢の並び順に揃える', () => {
    const equip = new Set(['organ', 'piano'])
    expect(built(p => writeSet(p, 'equip', equip, ['piano', 'organ']))).toBe('equip=piano%2Corgan')
  })

  it('既定の表示と並び替えは書かない', () => {
    expect(built(p => writeView(p, 'list'))).toBe('')
    expect(built(p => writeSort(p, '施設名', true, '施設名'))).toBe('')
  })

  it('既定でない表示と並び替えは書く', () => {
    expect(built(p => writeView(p, 'table'))).toBe('view=table')
    expect(decodeURIComponent(built(p => writeSort(p, '施設名', false, '施設名')))).toBe(
      'sort=施設名.desc',
    )
    expect(decodeURIComponent(built(p => writeSort(p, '客席数', true, '施設名')))).toBe(
      'sort=客席数.asc',
    )
  })
})
