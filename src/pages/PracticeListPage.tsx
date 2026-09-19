import { useMemo, Suspense, lazy } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { practices } from '../datasets/practices'
import { NO_WALK, minWalk, stationLabels, stationNames } from '../station'
import { ALL_PREFS } from '../pref'
import { nextSort, toggleIn, toggleKey } from '../toggle'
import useDocumentTitle from '../useDocumentTitle'
import { isClosed } from '../rental'
import {
  PRACTICE_EQUIP_FIELDS,
  filterPractices,
  maxArea,
  maxCapacity,
  practiceDetailPath,
  practiceStateFromParams,
  practiceStateToParams,
  sortPractices,
  type PracticePageState,
  type PracticeSortKey,
} from '../practice'
import ViewToggle from '../components/ViewToggle'
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
import UnknownNotice from '../components/UnknownNotice'
import ClosedToggle from '../components/ClosedToggle'

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

const closedCount = practices.filter(p => isClosed(p.貸館)).length

export default function PracticeListPage() {
  useDocumentTitle('練習場一覧')

  /**
   * 一覧の状態はURLが持つ。**`useState` に持たない。**
   * 絞り込んだ結果をそのまま人に送れて、詳細ページから戻っても条件が残る。
   */
  const [params, setParams] = useSearchParams()
  const state = useMemo(() => practiceStateFromParams(params), [params])
  const { query, prefs, city, capacity, station, walk, equip, showClosed, view, sortKey, sortAsc } =
    state

  /**
   * 条件をひとつ変えるたびに履歴をひとつ積む（戻るで直前の絞り込みに戻れる）。
   * **フリーワードだけは置き換える。** 打鍵ごとに積むと、戻るボタンが
   * 文字を1つずつ消すだけの操作になってしまう。
   */
  const update = (patch: Partial<PracticePageState>, replace = false) =>
    setParams(practiceStateToParams({ ...state, ...patch }), { replace })

  const toggleSort = (key: PracticeSortKey) => {
    const next = nextSort({ key: sortKey, asc: sortAsc }, key)
    update({ sortKey: next.key, sortAsc: next.asc })
  }

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
  // 「出戸バスターミナル」のように名前からは鉄道駅と区別がつかないものがある
  const stationDisplay = useMemo(() => stationLabels(practices), [])

  const { filtered, unknownExcluded, unknownFields } = useMemo(() => {
    const result = filterPractices(practices, {
      query,
      prefs,
      city,
      capacity,
      station,
      walk,
      equip,
      showClosed,
    })
    return { ...result, filtered: sortPractices(result.filtered, sortKey, sortAsc) }
  }, [query, prefs, city, capacity, station, walk, equip, showClosed, sortKey, sortAsc])

  function togglePref(pref: string) {
    // 府県を変えると選べる市区町村が変わるので、選択済みの市区町村は落とす
    update({ prefs: toggleIn(prefs, pref), city: '' })
  }

  const sortTh = (k: PracticeSortKey, label: string) => (
    <SortableTh k={k} label={label} sortKey={sortKey} sortAsc={sortAsc} onToggle={toggleSort} />
  )

  return (
    <div>
      <header className="page-head">
        <p className="page-head__eyebrow">REHEARSAL ROOMS</p>
        <h1 className="page-head__title">練習場一覧</h1>
        <p className="page-head__lead">
          関西の練習場を定員・設備・アクセスで比較。ホールに併設された練習室・リハーサル室も含みます
        </p>
      </header>

      <FilterPanel
        head={
          <>
            <SearchBox value={query} onChange={v => update({ query: v }, true)} />
            <SortSelect
              options={SORT_OPTIONS}
              sortKey={sortKey}
              sortAsc={sortAsc}
              onChange={(key, asc) => update({ sortKey: key, sortAsc: asc })}
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
            onChange={v => update({ city: v })}
          />
          <FilterSelect
            label="最寄駅"
            placeholder="最寄駅（すべて）"
            value={station}
            options={stations}
            formatOption={v => stationDisplay.get(v) ?? v}
            onChange={v => update({ station: v })}
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
                  onClick={() => update({ equip: toggleKey(equip, e.key) })}
                  className={on ? 'pill pill--equip pill--on' : 'pill pill--equip'}
                >
                  {on && <span className="pill__check">✓</span>}
                  {e.label}
                </button>
              )
            })}
          </FilterRow>
        )}

        <ClosedToggle
          on={showClosed}
          count={closedCount}
          onToggle={() => update({ showClosed: !showClosed })}
        />

        <div className="ranges">
          {hasCapacityData && (
            <BoundInput
              label="CAPACITY"
              title="定員"
              suffix="名以上"
              value={capacity}
              onChange={v => update({ capacity: v })}
            />
          )}
          <BoundInput
            label="WALK"
            title="最寄駅から"
            suffix="分以内"
            value={walk}
            onChange={v => update({ walk: v })}
          />
        </div>
      </FilterPanel>

      <ViewToggle view={view} onChangeView={v => update({ view: v })} count={filtered.length} />

      <UnknownNotice count={unknownExcluded} fields={unknownFields} />

      {view === 'list' && (
        <div className="facility-list">
          {filtered.map(p => (
            <FacilityCard
              key={practiceDetailPath(p)}
              facility={p}
              detailPath={practiceDetailPath(p)}
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
                <tr key={practiceDetailPath(p)}>
                  <td>
                    <Link to={practiceDetailPath(p)} className="data-table__link">
                      {p.施設名}
                    </Link>
                    {p.ホール併設 && <span className="data-table__note">ホール併設</span>}
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
          <FacilityMap facilities={filtered} detailPath={practiceDetailPath} />
        </Suspense>
      )}
    </div>
  )
}
