import type { ConcertHall, HallType, Availability } from './types'
import type { ViewMode } from './components/ViewToggle'
import {
  applyConditions,
  matchAvailability,
  matchOneOf,
  matchRange,
  matchText,
  type Condition,
  type FilterResult,
} from './filter'
import { fullAddress } from './address'
import { compareByName } from './name'
import { minWalk, stationNames } from './station'
import { ALL_PREFS } from './pref'
import {
  readList,
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
  type Range,
} from './query'

export type { Range }

/**
 * コンサートホール一覧の絞り込みと並び替え。
 *
 * ページから出しているのは、**ここが利用者にとっての中心機能なのに
 * 描画しないと動かせず、テストが1件も無かった**ため。
 * 一覧の見た目を直すつもりで条件を壊しても、型チェックも lint も通る。
 */

/** 表と選択肢の両方から並び替えられるキー */
export type HallSortKey = '施設名' | '都道府県' | '客席数' | '最寄駅徒歩'

export const ALL_HALL_TYPES: HallType[] = ['音楽専用', '多目的', '小ホール・サロン']

/**
 * 絞り込める設備。**3値（あり／なし／未調査）で扱う。**
 *
 * 駐車場だけは台数で持っているが、記録が無いこと（null）は「無い」ではなく
 * 「調べていない」なので、ここで3値に均す。以前は駐車場だけ別扱いにしていて、
 * 台数が未調査の施設が「未調査のため除外しました」に数えられないまま消えていた。
 */
export const HALL_EQUIP_FIELDS = [
  {
    key: 'piano',
    label: 'ピアノあり',
    unknownLabel: 'ピアノの有無',
    state: (h: ConcertHall) => h.ピアノ有無,
  },
  {
    key: 'organ',
    label: 'パイプオルガンあり',
    unknownLabel: 'パイプオルガンの有無',
    state: (h: ConcertHall) => h.パイプオルガン,
  },
  {
    key: 'stand',
    label: '譜面台貸出あり',
    unknownLabel: '譜面台貸出の有無',
    state: (h: ConcertHall) => h.譜面台貸出,
  },
  {
    key: 'family',
    label: '親子室あり',
    unknownLabel: '親子室の有無',
    state: (h: ConcertHall) => h.親子室,
  },
  {
    key: 'parking',
    label: '駐車場あり',
    unknownLabel: '駐車場の有無',
    state: (h: ConcertHall): Availability | undefined =>
      h.駐車場 == null ? undefined : h.駐車場 > 0,
  },
] as const

export interface HallCriteria {
  query: string
  prefs: string[]
  hallTypes: HallType[]
  seats: Range
  stageW: Range
  stageD: Range
  equip: Set<string>
}

export type { FilterResult }

/**
 * 条件を「合う / 合わない / 判断できない」で並べる（→ filter.ts）。
 *
 * **未調査で外れたものを数えるのは設備だけではない。** ホール種別・客席数・
 * 舞台寸法も調査の埋まり具合はまちまちで（客席数は284ホール中126件）、
 * 以前はこれらの未調査が黙って消えていた。
 */
function hallConditions(c: HallCriteria): Condition<ConcertHall>[] {
  return [
    // 都道府県・施設名・住所は必ずあるので、未調査にはならない
    { label: '都道府県', match: h => matchOneOf(h.都道府県, c.prefs) },
    { label: 'フリーワード', match: h => matchText(searchText(h), c.query) },
    { label: 'ホール種別', match: h => matchOneOf(h.ホール種別, c.hallTypes) },
    { label: '客席数', match: h => matchRange(h.客席数, c.seats) },
    { label: '舞台幅', match: h => matchRange(h.舞台幅, c.stageW) },
    { label: '舞台奥行', match: h => matchRange(h.舞台奥行, c.stageD) },
    ...HALL_EQUIP_FIELDS.filter(e => c.equip.has(e.key)).map(e => ({
      label: e.unknownLabel,
      match: (h: ConcertHall) => matchAvailability(e.state(h)),
    })),
  ]
}

/**
 * フリーワードが見る文字列。
 *
 * **施設名かなと最寄駅も含める。** 一覧用のJSONには載っているのに見ていなかったため、
 * 「いずみほーる」のように読みで打った人も、「梅田」のように駅名で探した人も
 * 0件になっていた（住所の地名と駅名は一致するとは限らない）。
 * 路線名は入れない。「JR」で何百件も当たると、絞り込みとして働かなくなる。
 */
function searchText(h: ConcertHall): string {
  return [h.施設名, h.施設名かな, h.部屋名, fullAddress(h), ...stationNames(h)]
    .filter(Boolean)
    .join(' ')
}

export function filterHalls(halls: ConcertHall[], c: HallCriteria): FilterResult<ConcertHall> {
  return applyConditions(halls, hallConditions(c))
}

export function sortHalls(halls: ConcertHall[], key: HallSortKey, asc: boolean): ConcertHall[] {
  const dir = asc ? 1 : -1
  return [...halls].sort((a, b) => {
    // 施設名は五十音順（コードポイント順だと 100BAN→7th Note→KOKO PLAZA→アイホール になる）
    if (key === '施設名') return dir * compareByName(a, b)
    let av: string | number, bv: string | number
    if (key === '都道府県') {
      av = a.都道府県
      bv = b.都道府県
    } else if (key === '客席数') {
      // 未調査は末尾ではなく最小として扱う（多い順では最後に来る）
      av = a.客席数 ?? -1
      bv = b.客席数 ?? -1
    } else {
      av = minWalk(a)
      bv = minWalk(b)
    }
    if (av < bv) return -dir
    if (av > bv) return dir
    return 0
  })
}

/** 平坦化された一覧は同一施設の複数ホールを含むため、地図では施設ごと1マーカーにまとめる */
export function dedupeByFacility(halls: ConcertHall[]): ConcertHall[] {
  const seen = new Map<number, ConcertHall>()
  for (const h of halls) if (!seen.has(h.ID)) seen.set(h.ID, h)
  return [...seen.values()]
}

/** 一覧ページの状態。**絞り込みだけでなく表示と並び替えもURLに載せる** */
export interface HallPageState extends HallCriteria {
  view: ViewMode
  sortKey: HallSortKey
  sortAsc: boolean
}

export const HALL_SORT_KEYS: HallSortKey[] = ['施設名', '都道府県', '客席数', '最寄駅徒歩']

const HALL_EQUIP_KEYS = HALL_EQUIP_FIELDS.map(e => e.key)

/**
 * URLから一覧の状態を読む。
 * 府県・ホール種別・設備は**知っている値だけ**を通す（手で書き換えられるため）。
 * フリーワードは何でも通す（絞り込みの結果が0件になるだけで、誤解は生まない）。
 */
export function hallStateFromParams(params: URLSearchParams): HallPageState {
  const { key, asc } = readSort(params, HALL_SORT_KEYS, '施設名')
  return {
    query: readText(params, 'q'),
    prefs: readList(params, 'pref', ALL_PREFS),
    hallTypes: readList(params, 'type', ALL_HALL_TYPES),
    seats: readRange(params, 'seats'),
    stageW: readRange(params, 'stagew'),
    stageD: readRange(params, 'staged'),
    equip: readSet(params, 'equip', HALL_EQUIP_KEYS),
    view: readView(params),
    sortKey: key,
    sortAsc: asc,
  }
}

export function hallStateToParams(s: HallPageState): URLSearchParams {
  const params = new URLSearchParams()
  writeText(params, 'q', s.query)
  writeList(params, 'pref', s.prefs)
  writeList(params, 'type', s.hallTypes)
  writeRange(params, 'seats', s.seats)
  writeRange(params, 'stagew', s.stageW)
  writeRange(params, 'staged', s.stageD)
  writeSet(params, 'equip', s.equip, HALL_EQUIP_KEYS)
  writeView(params, s.view)
  writeSort(params, s.sortKey, s.sortAsc, '施設名')
  return params
}
