import { useState, useMemo, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { practices } from '../datasets/practices'
import type { PracticeListItem } from '../types'
import { NO_WALK, minWalk, stationNames } from '../station'
import { fullAddress } from '../address'
import { compareByName } from '../name'
import { ALL_PREFS } from '../pref'
import useDocumentTitle from '../useDocumentTitle'
import ViewToggle, { type ViewMode } from '../components/ViewToggle'
import SortSelect, { type SortOption } from '../components/SortSelect'
import FilterPanel from '../components/FilterPanel'
import FilterRow from '../components/FilterRow'
import FilterSelect from '../components/FilterSelect'
import BoundInput from '../components/BoundInput'
import FacilityCard from '../components/FacilityCard'
import Stat from '../components/Stat'
import EquipBadge from '../components/EquipBadge'
import SortableTh from '../components/SortableTh'
import AvailabilityMark from '../components/AvailabilityMark'
import RentalBadge from '../components/RentalBadge'
import UsageConditionBadge from '../components/UsageConditionBadge'

// 地図は leaflet を引き込むので、地図表示に切り替えるまで読み込まない
const FacilityMap = lazy(() => import('../components/FacilityMap'))

type SortKey = '施設名' | '都道府県' | '最寄駅徒歩'

// 表の見出しからも並び替えられるので、どのキーも昇順・降順の両方を載せる
const SORT_OPTIONS: SortOption<SortKey>[] = [
  { key: '施設名', asc: true, label: '施設名（昇順）' },
  { key: '施設名', asc: false, label: '施設名（降順）' },
  { key: '都道府県', asc: true, label: '都道府県（昇順）' },
  { key: '都道府県', asc: false, label: '都道府県（降順）' },
  { key: '最寄駅徒歩', asc: true, label: '最寄駅徒歩（近い順）' },
  { key: '最寄駅徒歩', asc: false, label: '最寄駅徒歩（遠い順）' },
]

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort() as T[]
}

/**
 * 施設レベルと部屋レベルを合わせた設備の3値。
 * どこかの部屋で true なら施設として true（その部屋を使えばよい）。
 * すべて false なら false / 手がかりがなければ undefined（未調査）。
 */
function facilityState(values: (boolean | undefined)[]): boolean | undefined {
  if (values.some(v => v === true)) return true
  if (values.some(v => v === false)) return false
  return undefined
}

/**
 * 施設内で最も定員の多い部屋の定員。分からなければ 0。
 * 「◯名で使えるか」は部屋単位の話なので、施設としては最大の部屋で判断する。
 */
function maxCapacity(p: PracticeListItem): number {
  return Math.max(0, ...(p.部屋?.map(r => r.定員 ?? 0) ?? []))
}

/** 施設内で最も広い部屋の面積（㎡）。分からなければ 0 */
function maxArea(p: PracticeListItem): number {
  return Math.max(0, ...(p.部屋?.map(r => r.面積 ?? 0) ?? []))
}

/** 定員が1件も入っていないうちは、必ず0件になる絞り込みを見せない */
const hasCapacityData = practices.some(p => maxCapacity(p) > 0)

const EQUIP_FILTERS = [
  {
    key: 'piano',
    label: 'ピアノあり',
    badge: 'ピアノ',
    unknownLabel: 'ピアノの有無',
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

export default function PracticeListPage() {
  useDocumentTitle('練習場一覧')

  const [view, setView] = useState<ViewMode>('list')
  const [query, setQuery] = useState('')
  const [filterPrefs, setFilterPrefs] = useState<string[]>([])
  const [filterCity, setFilterCity] = useState('')
  const [filterCapacity, setFilterCapacity] = useState('')
  const [filterStation, setFilterStation] = useState('')
  const [filterWalk, setFilterWalk] = useState('')
  const [filterEquip, setFilterEquip] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('施設名')
  const [sortAsc, setSortAsc] = useState(true)

  // データが1件も無い設備は選択肢に出さない。必ず0件になる絞り込みを見せないため
  const equipOptions = useMemo(
    () => EQUIP_FILTERS.filter(e => practices.some(p => e.state(p) !== undefined)),
    [],
  )

  const prefs = useMemo(() => ALL_PREFS.filter(p => practices.some(x => x.都道府県 === p)), [])
  const cities = useMemo(
    () =>
      unique(
        practices
          .filter(p => filterPrefs.length === 0 || filterPrefs.includes(p.都道府県))
          .map(p => p.市区町村),
      ),
    [filterPrefs],
  )
  const stations = useMemo(() => unique(practices.flatMap(stationNames)), [])

  const { filtered, unknownExcluded } = useMemo(() => {
    // 設備以外の条件で先に絞る。設備は未調査による除外数を数えるため別段にする
    const base = practices.filter(p => {
      if (filterPrefs.length > 0 && !filterPrefs.includes(p.都道府県)) return false
      if (filterCity && p.市区町村 !== filterCity) return false
      if (filterCapacity && maxCapacity(p) < Number(filterCapacity)) return false
      if (filterStation && !stationNames(p).includes(filterStation)) return false
      if (filterWalk && minWalk(p) > Number(filterWalk)) return false
      if (query) {
        const q = query.toLowerCase()
        const text = `${p.施設名}${fullAddress(p)}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })

    const active = EQUIP_FILTERS.filter(e => filterEquip.has(e.key))
    const list = base.filter(p => active.every(e => e.state(p) === true))

    // 「設備がない」のではなく「未調査」のせいで消えた件数。黙って消さず利用者に開示する
    const shown = new Set(list)
    const excluded =
      active.length === 0
        ? 0
        : base.filter(p => !shown.has(p) && active.some(e => e.state(p) === undefined)).length

    const sorted = [...list].sort((a, b) => {
      // 施設名は五十音順（コードポイント順だと 100BAN→7th Note→KOKO PLAZA→アイホール になる）
      if (sortKey === '施設名') return (sortAsc ? 1 : -1) * compareByName(a, b)
      let av: string | number, bv: string | number
      if (sortKey === '都道府県') {
        av = a.都道府県
        bv = b.都道府県
      } else {
        av = minWalk(a)
        bv = minWalk(b)
      }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })

    return { filtered: sorted, unknownExcluded: excluded }
  }, [
    query,
    filterPrefs,
    filterCity,
    filterCapacity,
    filterStation,
    filterWalk,
    filterEquip,
    sortKey,
    sortAsc,
  ])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  function togglePref(pref: string) {
    // 府県を変えると選べる市区町村が変わるので、選択済みの市区町村は落とす
    setFilterCity('')
    setFilterPrefs(prev => (prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]))
  }

  function toggleEquip(key: string) {
    setFilterEquip(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const sortTh = (k: SortKey, label: string) => (
    <SortableTh k={k} label={label} sortKey={sortKey} sortAsc={sortAsc} onToggle={toggleSort} />
  )

  return (
    <div>
      <header className="page-head">
        <p className="page-head__eyebrow">REHEARSAL ROOMS</p>
        <h1 className="page-head__title">練習場一覧</h1>
        <p className="page-head__lead">関西の練習場を定員・設備・アクセスで比較</p>
      </header>

      <FilterPanel
        head={
          <>
            <div className="search">
              <svg
                className="search__icon"
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <circle cx="5.5" cy="5.5" r="3.5" />
                <path d="M8 8l3 3" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                className="search__input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="フリーワード検索"
                aria-label="フリーワード検索"
              />
            </div>
            <SortSelect
              options={SORT_OPTIONS}
              sortKey={sortKey}
              sortAsc={sortAsc}
              onChange={(k, asc) => {
                setSortKey(k)
                setSortAsc(asc)
              }}
            />
          </>
        }
      >
        <FilterRow label="PREFECTURE" title="都道府県">
          {prefs.map(pref => {
            const on = filterPrefs.includes(pref)
            return (
              <button
                key={pref}
                type="button"
                data-pref={pref}
                aria-pressed={on}
                onClick={() => togglePref(pref)}
                className={on ? 'pill pill--on' : 'pill'}
              >
                {on && <span className="pill__check">✓</span>}
                {pref}
              </button>
            )
          })}
        </FilterRow>

        <FilterRow label="AREA" title="市区町村・駅">
          <FilterSelect
            label="市区町村"
            placeholder="市区町村（すべて）"
            value={filterCity}
            options={cities}
            onChange={setFilterCity}
          />
          <FilterSelect
            label="最寄駅"
            placeholder="最寄駅（すべて）"
            value={filterStation}
            options={stations}
            onChange={setFilterStation}
          />
        </FilterRow>

        {equipOptions.length > 0 && (
          <FilterRow label="EQUIPMENT" title="設備">
            {equipOptions.map(e => {
              const on = filterEquip.has(e.key)
              return (
                <button
                  key={e.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleEquip(e.key)}
                  className={on ? 'pill pill--equip pill--on' : 'pill pill--equip'}
                >
                  {on && <span className="pill__check">✓</span>}
                  {e.label}
                </button>
              )
            })}
          </FilterRow>
        )}

        <div className="ranges">
          {hasCapacityData && (
            <BoundInput
              label="CAPACITY"
              title="定員"
              suffix="名以上"
              value={filterCapacity}
              onChange={setFilterCapacity}
            />
          )}
          <BoundInput
            label="WALK"
            title="最寄駅から"
            suffix="分以内"
            value={filterWalk}
            onChange={setFilterWalk}
          />
        </div>
      </FilterPanel>

      <ViewToggle view={view} onChangeView={setView} count={filtered.length} />

      {unknownExcluded > 0 && (
        <div className="notice notice--warn" role="status">
          <span aria-hidden>⚠</span>
          <span>
            {EQUIP_FILTERS.filter(e => filterEquip.has(e.key))
              .map(e => e.unknownLabel)
              .join('・')}
            が<strong>未調査</strong>の {unknownExcluded} 件を絞り込みから除外しています。
            「ない」と確認できたわけではないため、実際には条件に合う施設が含まれている可能性があります。
          </span>
        </div>
      )}

      {view === 'list' && (
        <div className="facility-list">
          {filtered.map(p => (
            <FacilityCard
              key={p.ID}
              facility={p}
              detailBasePath="/practice"
              stats={
                <>
                  <Stat values={[maxCapacity(p) || null]} unit="名" caption="CAPACITY" />
                  <Stat values={[maxArea(p) || null]} unit="㎡" caption="AREA" align="right" />
                </>
              }
              equip={
                <>
                  {EQUIP_FILTERS.map(e => (
                    <EquipBadge key={e.key} label={e.badge} on={e.state(p) === true} />
                  ))}
                  <EquipBadge label="駐車場" on={p.駐車場 != null && p.駐車場 > 0} />
                </>
              }
            />
          ))}
          {filtered.length === 0 && <p className="empty">該当する施設がありません</p>}
        </div>
      )}

      {view === 'table' && (
        <div className="table-wrap">
          <table className="data-table">
            {/* 表が何の一覧なのかは見出しを辿らないと分からないので、読み上げ用に添える */}
            <caption className="visually-hidden">練習場の一覧（{filtered.length}件）</caption>
            <thead>
              <tr>
                {sortTh('施設名', '施設名')}
                {sortTh('都道府県', '都道府県')}
                <th scope="col">市区町村</th>
                <th scope="col">最大定員</th>
                <th scope="col">最大面積(㎡)</th>
                {sortTh('最寄駅徒歩', '徒歩(分)')}
                <th scope="col" className="is-center">
                  ピアノ
                </th>
                <th scope="col" className="is-center">
                  管楽器
                </th>
                <th scope="col" className="is-center">
                  打楽器
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.ID}>
                  <td>
                    <Link to={`/practice/${p.ID}`} className="data-table__link">
                      {p.施設名}
                    </Link>
                    <RentalBadge 貸館={p.貸館} />
                    <UsageConditionBadge 利用条件={p.利用条件} />
                  </td>
                  <td className="is-nowrap">{p.都道府県}</td>
                  <td className="is-nowrap">{p.市区町村}</td>
                  <td className="is-num">{maxCapacity(p) || '—'}</td>
                  <td className="is-num">{maxArea(p) || '—'}</td>
                  <td className="is-num">{minWalk(p) < NO_WALK ? minWalk(p) : '—'}</td>
                  <td className="is-center">
                    <AvailabilityMark value={EQUIP_FILTERS[0].state(p)} />
                  </td>
                  <td className="is-center">
                    <AvailabilityMark value={EQUIP_FILTERS[1].state(p)} />
                  </td>
                  <td className="is-center">
                    <AvailabilityMark value={EQUIP_FILTERS[2].state(p)} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">
                    該当する施設がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'map' && (
        <Suspense fallback={<p className="loading">地図を読み込んでいます…</p>}>
          <FacilityMap facilities={filtered} detailBasePath="/practice" />
        </Suspense>
      )}
    </div>
  )
}
