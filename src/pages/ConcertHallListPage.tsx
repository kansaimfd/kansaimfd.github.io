import { useMemo, Suspense, lazy } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { concerthalls } from '../datasets/concerthalls'
import { NO_WALK, minWalk } from '../station'
import { ALL_PREFS } from '../pref'
import { nextSort, toggleIn, toggleKey } from '../toggle'
import useDocumentTitle from '../useDocumentTitle'
import {
  ALL_HALL_TYPES,
  HALL_EQUIP_FIELDS,
  dedupeByFacility,
  filterHalls,
  hallStateFromParams,
  hallStateToParams,
  sortHalls,
  type HallPageState,
  type HallSortKey,
} from '../concerthall'
import ViewToggle from '../components/ViewToggle'
import SortSelect, { type SortOption } from '../components/SortSelect'
import SearchBox from '../components/SearchBox'
import FilterPanel from '../components/FilterPanel'
import FilterRow from '../components/FilterRow'
import RangeInput from '../components/RangeInput'
import FacilityCard from '../components/FacilityCard'
import Stat from '../components/Stat'
import EquipBadge from '../components/EquipBadge'
import SortableTh from '../components/SortableTh'
import AvailabilityMark from '../components/AvailabilityMark'
import RentalBadge from '../components/RentalBadge'
import UsageConditionBadge from '../components/UsageConditionBadge'
import UnknownNotice from '../components/UnknownNotice'

// 地図は leaflet を引き込むので、地図表示に切り替えるまで読み込まない
const FacilityMap = lazy(() => import('../components/FacilityMap'))

// 表の見出しからも並び替えられるので、どのキーも昇順・降順の両方を載せる
const SORT_OPTIONS: SortOption<HallSortKey>[] = [
  { key: '施設名', asc: true, label: '施設名（昇順）' },
  { key: '施設名', asc: false, label: '施設名（降順）' },
  { key: '都道府県', asc: true, label: '都道府県（昇順）' },
  { key: '都道府県', asc: false, label: '都道府県（降順）' },
  { key: '客席数', asc: false, label: '客席数（多い順）' },
  { key: '客席数', asc: true, label: '客席数（少ない順）' },
  { key: '最寄駅徒歩', asc: true, label: '最寄駅徒歩（近い順）' },
  { key: '最寄駅徒歩', asc: false, label: '最寄駅徒歩（遠い順）' },
]

export default function ConcertHallListPage() {
  useDocumentTitle('コンサートホール一覧')

  /**
   * 一覧の状態はURLが持つ。**`useState` に持たない。**
   * 絞り込んだ結果をそのまま人に送れて、詳細ページから戻っても条件が残る。
   */
  const [params, setParams] = useSearchParams()
  const state = useMemo(() => hallStateFromParams(params), [params])
  const { query, prefs, hallTypes, seats, stageW, stageD, equip, view, sortKey, sortAsc } = state

  /**
   * 条件をひとつ変えるたびに履歴をひとつ積む（戻るで直前の絞り込みに戻れる）。
   * **フリーワードだけは置き換える。** 打鍵ごとに積むと、戻るボタンが
   * 文字を1つずつ消すだけの操作になってしまう。
   */
  const update = (patch: Partial<HallPageState>, replace = false) =>
    setParams(hallStateToParams({ ...state, ...patch }), { replace })

  const toggleSort = (key: HallSortKey) => {
    const next = nextSort({ key: sortKey, asc: sortAsc }, key)
    update({ sortKey: next.key, sortAsc: next.asc })
  }

  // データが1件も無い種別は選択肢に出さない。必ず0件になる絞り込みを見せないため
  const hallTypeOptions = useMemo(
    () => ALL_HALL_TYPES.filter(t => concerthalls.some(h => h.ホール種別 === t)),
    [],
  )

  const { filtered, unknownExcluded, unknownFields } = useMemo(() => {
    const result = filterHalls(concerthalls, {
      query,
      prefs,
      hallTypes,
      seats,
      stageW,
      stageD,
      equip,
    })
    return { ...result, filtered: sortHalls(result.filtered, sortKey, sortAsc) }
  }, [query, prefs, hallTypes, seats, stageW, stageD, equip, sortKey, sortAsc])

  const sortTh = (k: HallSortKey, label: string) => (
    <SortableTh k={k} label={label} sortKey={sortKey} sortAsc={sortAsc} onToggle={toggleSort} />
  )

  return (
    <div>
      <header className="page-head">
        <p className="page-head__eyebrow">CONCERT HALLS</p>
        <h1 className="page-head__title">コンサートホール一覧</h1>
        <p className="page-head__lead">関西6府県のホールを客席数・設備・アクセスで比較</p>
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
          {ALL_PREFS.map(pref => {
            const on = prefs.includes(pref)
            return (
              <button
                key={pref}
                type="button"
                data-pref={pref}
                aria-pressed={on}
                onClick={() => update({ prefs: toggleIn(prefs, pref) })}
                className={on ? 'pill pill--on' : 'pill'}
              >
                {on && <span className="pill__check">✓</span>}
                {pref}
              </button>
            )
          })}
        </FilterRow>

        {hallTypeOptions.length > 0 && (
          <FilterRow label="HALL TYPE" title="ホール種別">
            {hallTypeOptions.map(t => {
              const on = hallTypes.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update({ hallTypes: toggleIn(hallTypes, t) })}
                  className={on ? 'pill pill--on' : 'pill'}
                >
                  {on && <span className="pill__check">✓</span>}
                  {t}
                </button>
              )
            })}
          </FilterRow>
        )}

        <FilterRow label="EQUIPMENT" title="設備">
          {HALL_EQUIP_FIELDS.map(({ key, label }) => {
            const on = equip.has(key)
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => update({ equip: toggleKey(equip, key) })}
                className={on ? 'pill pill--equip pill--on' : 'pill pill--equip'}
              >
                {on && <span className="pill__check">✓</span>}
                {label}
              </button>
            )
          })}
        </FilterRow>

        <div className="ranges">
          <RangeInput
            label="CAPACITY"
            title="客席数"
            unit="席"
            value={seats}
            onChange={v => update({ seats: v })}
          />
          <RangeInput
            label="STAGE WIDTH"
            title="舞台幅"
            unit="m"
            value={stageW}
            onChange={v => update({ stageW: v })}
          />
          <RangeInput
            label="STAGE DEPTH"
            title="舞台奥行き"
            unit="m"
            value={stageD}
            onChange={v => update({ stageD: v })}
          />
        </div>
      </FilterPanel>

      <ViewToggle view={view} onChangeView={v => update({ view: v })} count={filtered.length} />

      <UnknownNotice count={unknownExcluded} fields={unknownFields} />

      {view === 'list' && (
        <div className="facility-list">
          {filtered.map(h => (
            <FacilityCard
              key={h.キー}
              facility={h}
              detailBasePath="/concert"
              stats={
                <>
                  <Stat values={[h.客席数]} unit="席" caption="CAPACITY" />
                  <Stat
                    values={[h.舞台幅, h.舞台奥行]}
                    unit="m"
                    caption="STAGE W×D"
                    align="right"
                  />
                </>
              }
              equip={
                <>
                  <EquipBadge label="ピアノ" on={h.ピアノ有無 === true} />
                  <EquipBadge label="オルガン" on={h.パイプオルガン === true} />
                  <EquipBadge label="譜面台" on={h.譜面台貸出 === true} />
                  <EquipBadge label="親子室" on={h.親子室 === true} />
                  <EquipBadge label="駐車場" on={h.駐車場 != null && h.駐車場 > 0} />
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
            <caption className="visually-hidden">
              コンサートホールの一覧（{filtered.length}件）
            </caption>
            <thead>
              <tr>
                {sortTh('施設名', '施設名')}
                {sortTh('都道府県', '都道府県')}
                <th scope="col">市区町村</th>
                {sortTh('客席数', '客席数')}
                <th scope="col">舞台(W×D)</th>
                {sortTh('最寄駅徒歩', '徒歩(分)')}
                <th scope="col" className="is-center">
                  ピアノ
                </th>
                <th scope="col" className="is-center">
                  オルガン
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => (
                <tr key={h.キー}>
                  <td>
                    <Link to={`/concert/${h.ID}`} className="data-table__link">
                      {h.施設名}
                      {h.部屋名 ? `（${h.部屋名}）` : ''}
                    </Link>
                    <RentalBadge 貸館={h.貸館} />
                    <UsageConditionBadge 利用条件={h.利用条件} />
                  </td>
                  <td className="is-nowrap">{h.都道府県}</td>
                  <td className="is-nowrap">{h.市区町村}</td>
                  <td className="is-num">{h.客席数 ?? '—'}</td>
                  <td className="is-nowrap">
                    {h.舞台幅 != null && h.舞台奥行 != null ? `${h.舞台幅}×${h.舞台奥行}` : '—'}
                  </td>
                  <td className="is-num">{minWalk(h) < NO_WALK ? minWalk(h) : '—'}</td>
                  <td className="is-center">
                    <AvailabilityMark value={h.ピアノ有無} />
                  </td>
                  <td className="is-center">
                    <AvailabilityMark value={h.パイプオルガン} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
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
          <FacilityMap facilities={dedupeByFacility(filtered)} detailBasePath="/concert" />
        </Suspense>
      )}
    </div>
  )
}
