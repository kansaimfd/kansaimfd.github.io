import type { PracticeListItem, Availability } from './types'
import type { ViewMode } from './components/ViewToggle'
import { fullAddress } from './address'
import { compareByName } from './name'
import { minWalk, stationNames } from './station'
import type { FilterResult } from './concerthall'
import { ALL_PREFS } from './pref'
import {
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
}

export function filterPractices(
  practices: PracticeListItem[],
  c: PracticeCriteria,
): FilterResult<PracticeListItem> {
  // 設備以外の条件で先に絞る。設備は未調査による除外数を数えるため別段にする
  const base = practices.filter(p => {
    if (c.prefs.length > 0 && !c.prefs.includes(p.都道府県)) return false
    if (c.city && p.市区町村 !== c.city) return false
    if (c.capacity && maxCapacity(p) < Number(c.capacity)) return false
    if (c.station && !stationNames(p).includes(c.station)) return false
    if (c.walk && minWalk(p) > Number(c.walk)) return false
    if (c.query) {
      const q = c.query.toLowerCase()
      const text = `${p.施設名}${fullAddress(p)}`.toLowerCase()
      if (!text.includes(q)) return false
    }
    return true
  })

  const active = PRACTICE_EQUIP_FIELDS.filter(e => c.equip.has(e.key))
  const filtered = base.filter(p => active.every(e => e.state(p) === true))

  const shown = new Set(filtered)
  const unknownExcluded =
    active.length === 0
      ? 0
      : base.filter(p => !shown.has(p) && active.some(e => e.state(p) === undefined)).length

  return { filtered, unknownExcluded }
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
    let av: string | number, bv: string | number
    if (key === '都道府県') {
      av = a.都道府県
      bv = b.都道府県
    } else {
      av = minWalk(a)
      bv = minWalk(b)
    }
    if (av < bv) return -dir
    if (av > bv) return dir
    return 0
  })
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
  writeView(params, s.view)
  writeSort(params, s.sortKey, s.sortAsc, '施設名')
  return params
}
