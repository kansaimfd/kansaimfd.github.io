import { useState, useMemo, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { practices } from '../datasets/practices'
import { NO_WALK, minWalk, stationNames } from '../station'
import { ALL_PREFS } from '../pref'
import { toggleIn, toggleKey } from '../toggle'
import useSort from '../useSort'
import useDocumentTitle from '../useDocumentTitle'
import {
  PRACTICE_EQUIP_FIELDS,
  filterPractices,
  maxArea,
  maxCapacity,
  sortPractices,
  type PracticeSortKey,
} from '../practice'
import ViewToggle, { type ViewMode } from '../components/ViewToggle'
import SortSelect, { type SortOption } from '../components/SortSelect'
import SearchBox from '../components/SearchBox'
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

// 表の見出しからも並び替えられるので、どのキーも昇順・降順の両方を載せる
const SORT_OPTIONS: SortOption<PracticeSortKey>[] = [
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

/** 定員が1件も入っていないうちは、必ず0件になる絞り込みを見せない */
const hasCapacityData = practices.some(p => maxCapacity(p) > 0)

export default function PracticeListPage() {
  useDocumentTitle('練習場一覧')

  const [view, setView] = useState<ViewMode>('list')
  const [query, setQuery] = useState('')
  const [prefs, setPrefs] = useState<string[]>([])
  const [city, setCity] = useState('')
  const [capacity, setCapacity] = useState('')
  const [station, setStation] = useState('')
  const [walk, setWalk] = useState('')
  const [equip, setEquip] = useState<Set<string>>(new Set())
  const { sortKey, sortAsc, toggleSort, setSort } = useSort<PracticeSortKey>('施設名')

  // データが1件も無い設備は選択肢に出さない。必ず0件になる絞り込みを見せないため
  const equipOptions = useMemo(
    () => PRACTICE_EQUIP_FIELDS.filter(e => practices.some(p => e.state(p) !== undefined)),
    [],
  )

  const prefOptions = useMemo(
    () => ALL_PREFS.filter(p => practices.some(x => x.都道府県 === p)),
    [],
  )
  const cities = useMemo(
    () =>
      unique(
        practices
          .filter(p => prefs.length === 0 || prefs.includes(p.都道府県))
          .map(p => p.市区町村),
      ),
    [prefs],
  )
  const stations = useMemo(() => unique(practices.flatMap(stationNames)), [])

  const { filtered, unknownExcluded } = useMemo(() => {
    const result = filterPractices(practices, {
      query,
      prefs,
      city,
      capacity,
      station,
      walk,
      equip,
    })
    return { ...result, filtered: sortPractices(result.filtered, sortKey, sortAsc) }
  }, [query, prefs, city, capacity, station, walk, equip, sortKey, sortAsc])

  function togglePref(pref: string) {
    // 府県を変えると選べる市区町村が変わるので、選択済みの市区町村は落とす
    setCity('')
    setPrefs(toggleIn(prefs, pref))
  }

  const sortTh = (k: PracticeSortKey, label: string) => (
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
            <SearchBox value={query} onChange={setQuery} />
            <SortSelect
              options={SORT_OPTIONS}
              sortKey={sortKey}
              sortAsc={sortAsc}
              onChange={setSort}
            />
          </>
        }
      >
        <FilterRow label="PREFECTURE" title="都道府県">
          {prefOptions.map(pref => {
            const on = prefs.includes(pref)
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
            value={city}
            options={cities}
            onChange={setCity}
          />
          <FilterSelect
            label="最寄駅"
            placeholder="最寄駅（すべて）"
            value={station}
            options={stations}
            onChange={setStation}
          />
        </FilterRow>

        {equipOptions.length > 0 && (
          <FilterRow label="EQUIPMENT" title="設備">
            {equipOptions.map(e => {
              const on = equip.has(e.key)
              return (
                <button
                  key={e.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setEquip(toggleKey(equip, e.key))}
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
              value={capacity}
              onChange={setCapacity}
            />
          )}
          <BoundInput
            label="WALK"
            title="最寄駅から"
            suffix="分以内"
            value={walk}
            onChange={setWalk}
          />
        </div>
      </FilterPanel>

      <ViewToggle view={view} onChangeView={setView} count={filtered.length} />

      {unknownExcluded > 0 && (
        <div className="notice notice--warn" role="status">
          <span aria-hidden>⚠</span>
          <span>
            {PRACTICE_EQUIP_FIELDS.filter(e => equip.has(e.key))
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
                  {PRACTICE_EQUIP_FIELDS.map(e => (
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
                    <AvailabilityMark value={PRACTICE_EQUIP_FIELDS[0].state(p)} />
                  </td>
                  <td className="is-center">
                    <AvailabilityMark value={PRACTICE_EQUIP_FIELDS[1].state(p)} />
                  </td>
                  <td className="is-center">
                    <AvailabilityMark value={PRACTICE_EQUIP_FIELDS[2].state(p)} />
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
