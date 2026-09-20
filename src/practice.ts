import type { PracticeListItem, Availability } from './types'
import type { ViewMode } from './components/ViewToggle'
import { fullAddress } from './address'
import { compareByName } from './name'
import { compareUnknownLast } from './sort'
import { knownWalk, stationNames } from './station'
import {
  applyConditions,
  matchAny,
  matchAtLeast,
  matchAtMost,
  matchAvailability,
  matchOneOf,
  matchText,
  type Condition,
  type FilterResult,
} from './filter'
import { ALL_PREFS } from './pref'
import { matchRentable } from './rental'
import {
  readFlag,
  writeFlag,
  readList,
  readNumber,
  readSet,
  readSort,
  readText,
  readView,
  writeList,
  writeSet,
  writeSort,
  writeText,
  writeView,
} from './query'

/**
 * 練習場一覧の絞り込みと並び替え。理由はコンサートホール側と同じで、
 * 中心機能なのに描画しないと動かせない状態を解く（concerthall.ts の冒頭）。
 */

export type PracticeSortKey = '施設名' | '都道府県' | '最寄駅徒歩'

/**
 * 施設レベルと部屋レベルを合わせた設備の3値。
 * どこかの部屋で true なら施設として true（その部屋を使えばよい）。
 * すべて false なら false / 手がかりがなければ undefined（未調査）。
 */
export function facilityState(values: (Availability | undefined)[]): Availability | undefined {
  if (values.some(v => v === true)) return true
  if (values.some(v => v === false)) return false
  return undefined
}

/**
 * 施設内で最も定員の多い部屋の定員。分からなければ 0。
 * 「◯名で使えるか」は部屋単位の話なので、施設としては最大の部屋で判断する。
 */
export function maxCapacity(p: PracticeListItem): number {
  return Math.max(0, ...(p.部屋?.map(r => r.定員 ?? 0) ?? []))
}

/** 施設内で最も広い部屋の面積（㎡）。分からなければ 0 */
export function maxArea(p: PracticeListItem): number {
  return Math.max(0, ...(p.部屋?.map(r => r.面積 ?? 0) ?? []))
}

/**
 * 絞り込み用の定員。**分からない場合は 0 ではなく undefined を返す。**
 * 0 に均すと「定員が未調査の施設」と「定員0の施設」が同じ扱いになり、
 * 未調査のまま静かに除外されてしまう（表示用の maxCapacity とはここが違う）。
 */
export function knownCapacity(p: PracticeListItem): number | undefined {
  const known = p.部屋?.map(r => r.定員).filter(v => v != null) ?? []
  return known.length > 0 ? Math.max(...known) : undefined
}

export const PRACTICE_EQUIP_FIELDS = [
  {
    key: 'piano',
    label: 'ピアノあり',
    badge: 'ピアノ',
    unknownLabel: 'ピアノの有無',
    // 施設レベルの貸出備品（受付で申し込む形）も手がかりに含める
    state: (p: PracticeListItem) =>
      facilityState([p.ピアノ有無, ...(p.部屋?.map(r => r.ピアノ有無) ?? [])]),
  },
  {
    key: 'wind',
    label: '管楽器可',
    badge: '管楽器',
    unknownLabel: '管楽器の可否',
    state: (p: PracticeListItem) => facilityState(p.部屋?.map(r => r.管楽器) ?? []),
  },
  {
    key: 'perc',
    label: '打楽器可',
    badge: '打楽器',
    unknownLabel: '打楽器の可否',
    state: (p: PracticeListItem) => facilityState(p.部屋?.map(r => r.打楽器) ?? []),
  },
  {
    key: 'cembalo',
    label: 'チェンバロあり',
    badge: 'チェンバロ',
    unknownLabel: 'チェンバロの有無',
    state: (p: PracticeListItem) => facilityState(p.部屋?.map(r => r.チェンバロ) ?? []),
  },
] as const

export interface PracticeCriteria {
  query: string
  prefs: string[]
  city: string
  /** 「◯名以上」。空文字は指定なし */
  capacity: string
  station: string
  /** 「◯分以内」。空文字は指定なし */
  walk: string
  equip: Set<string>
  /** 貸館を終えた（終了・廃止）ものも出すか。既定では出さない */
  showClosed: boolean
}

/**
 * 条件を「合う / 合わない / 判断できない」で並べる（→ filter.ts）。
 * 定員・最寄駅・徒歩分数も未調査がありうるので、設備と同じ扱いにする。
 */
function practiceConditions(c: PracticeCriteria): Condition<PracticeListItem>[] {
  return [
    // 貸館の状態・都道府県・市区町村・施設名・住所は必ず判断できるので、未調査にはならない
    { label: '貸館', match: p => matchRentable(p.貸館, c.showClosed) },
    { label: '都道府県', match: p => matchOneOf(p.都道府県, c.prefs) },
    { label: '市区町村', match: p => matchOneOf(p.市区町村, c.city ? [c.city] : []) },
    { label: 'フリーワード', match: p => matchText(searchText(p), c.query) },
    { label: '定員', match: p => matchAtLeast(knownCapacity(p), c.capacity) },
    { label: '最寄駅', match: p => matchAny(stationNames(p), c.station ? [c.station] : []) },
    { label: '駅徒歩', match: p => matchAtMost(knownWalk(p), c.walk) },
    ...PRACTICE_EQUIP_FIELDS.filter(e => c.equip.has(e.key)).map(e => ({
      label: e.unknownLabel,
      match: (p: PracticeListItem) => matchAvailability(e.state(p)),
    })),
  ]
}

/** フリーワードが見る文字列（考え方はコンサートホール側と同じ） */
function searchText(p: PracticeListItem): string {
  return [p.施設名, p.施設名かな, fullAddress(p), ...stationNames(p)].filter(Boolean).join(' ')
}

export function filterPractices(
  practices: PracticeListItem[],
  c: PracticeCriteria,
): FilterResult<PracticeListItem> {
  return applyConditions(practices, practiceConditions(c))
}

export function sortPractices(
  practices: PracticeListItem[],
  key: PracticeSortKey,
  asc: boolean,
): PracticeListItem[] {
  const dir = asc ? 1 : -1
  return [...practices].sort((a, b) => {
    // 施設名は五十音順（コードポイント順だと 100BAN→7th Note→KOKO PLAZA→アイホール になる）
    if (key === '施設名') return dir * compareByName(a, b)
    // 徒歩分数の未調査は、向きに関わらず末尾へ（→ sort.ts）
    if (key === '都道府県') return compareUnknownLast(a.都道府県, b.都道府県, dir)
    return compareUnknownLast(knownWalk(a), knownWalk(b), dir)
  })
}

/**
 * 詳細ページのパス。**コンサートホールに併設された練習室はホール側の詳細ページに行く**
 * （ID もコンサートホール側のもの）。同じIDの練習場と区別がつくので、React の key にも使う。
 */
export function practiceDetailPath(p: Pick<PracticeListItem, 'ID' | 'ホール併設'>): string {
  return `${p.ホール併設 ? '/concert' : '/practice'}/${p.ID}`
}

/** 一覧ページの状態。**絞り込みだけでなく表示と並び替えもURLに載せる** */
export interface PracticePageState extends PracticeCriteria {
  view: ViewMode
  sortKey: PracticeSortKey
  sortAsc: boolean
}

export const PRACTICE_SORT_KEYS: PracticeSortKey[] = ['施設名', '都道府県', '最寄駅徒歩']

const PRACTICE_EQUIP_KEYS = PRACTICE_EQUIP_FIELDS.map(e => e.key)

/**
 * URLから一覧の状態を読む。
 *
 * 府県と設備は**知っている値だけ**を通す。市区町村・最寄駅はデータ側にしか
 * 一覧が無いのでそのまま通す（該当なしになるだけで、フリーワードと同じ扱い）。
 */
export function practiceStateFromParams(params: URLSearchParams): PracticePageState {
  const { key, asc } = readSort(params, PRACTICE_SORT_KEYS, '施設名')
  return {
    query: readText(params, 'q'),
    prefs: readList(params, 'pref', ALL_PREFS),
    city: readText(params, 'city'),
    capacity: readNumber(params, 'cap'),
    station: readText(params, 'station'),
    walk: readNumber(params, 'walk'),
    equip: readSet(params, 'equip', PRACTICE_EQUIP_KEYS),
    showClosed: readFlag(params, 'closed'),
    view: readView(params),
    sortKey: key,
    sortAsc: asc,
  }
}

export function practiceStateToParams(s: PracticePageState): URLSearchParams {
  const params = new URLSearchParams()
  writeText(params, 'q', s.query)
  writeList(params, 'pref', s.prefs)
  writeText(params, 'city', s.city)
  writeText(params, 'cap', s.capacity)
  writeText(params, 'station', s.station)
  writeText(params, 'walk', s.walk)
  writeSet(params, 'equip', s.equip, PRACTICE_EQUIP_KEYS)
  writeFlag(params, 'closed', s.showClosed)
  writeView(params, s.view)
  writeSort(params, s.sortKey, s.sortAsc, '施設名')
  return params
}
