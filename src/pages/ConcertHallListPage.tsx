import { useMemo, Suspense, lazy } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { concerthalls } from '../datasets/concerthalls'
import { NO_WALK, minWalk } from '../station'
import { cityOptions, equipOptions, prefOptions, stationOptions } from '../options'
import { nextSort, toggleIn, toggleKey } from '../toggle'
import useDocumentTitle from '../useDocumentTitle'
import { isClosed } from '../rental'
import {
  HALL_EQUIP_FIELDS,
  dedupeByFacility,
  filterHalls,
  groupByFacility,
  hallStateFromParams,
  hallStateToParams,
  rentalVariesByHall,
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
import BoundInput from '../components/BoundInput'
import FilterSelect from '../components/FilterSelect'
import FacilityCard from '../components/FacilityCard'
import HallStats from '../components/HallStats'
import Stat from '../components/Stat'
import EquipBadge from '../components/EquipBadge'
import SortableTh from '../components/SortableTh'
import AvailabilityMark from '../components/AvailabilityMark'
import TableNum from '../components/TableNum'
import RentalBadge from '../components/RentalBadge'
import UsageConditionBadge from '../components/UsageConditionBadge'
import UnknownNotice from '../components/UnknownNotice'
import ClosedToggle from '../components/ClosedToggle'

// 地図は maplibre-gl（gzip で約420KB）を引き込むので、地図表示に切り替えるまで読み込まない
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

const closedCount = concerthalls.filter(h => isClosed(h.貸館)).length

export default function ConcertHallListPage() {
  useDocumentTitle('コンサートホール一覧')

  /**
   * 一覧の状態はURLが持つ。**`useState` に持たない。**
   * 絞り込んだ結果をそのまま人に送れて、詳細ページから戻っても条件が残る。
   */
  const [params, setParams] = useSearchParams()
  /**
   * **ホール種別の絞り込みは画面から外してある**（区分の用途を整理し直すまで）。
   * 「多目的」が多目的室を連想させ、オーケストラを想定した劇場型ホールと
   * 区別できないため。データと `filterHalls` 側は残してある。
   * URLに `type=` が残っていても効かせない。見えない条件で絞ると
   * 「なぜか件数が少ない」画面になり、書き戻すときにも落ちる
   */
  const state = useMemo(() => ({ ...hallStateFromParams(params), hallTypes: [] }), [params])
  const {
    query,
    prefs,
    city,
    station,
    walk,
    hallTypes,
    seats,
    stageW,
    stageD,
    equip,
    showClosed,
    view,
    sortKey,
    sortAsc,
  } = state

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

  /**
   * 府県・市区町村・最寄駅・設備の選択肢（→ options.ts）。
   * 一覧は施設×ホールに平坦化されているので重複するが、選択肢を作る側で落とす。
   */
  const prefChoices = useMemo(() => prefOptions(concerthalls), [])
  const equipChoices = useMemo(() => equipOptions(HALL_EQUIP_FIELDS, concerthalls), [])
  const cities = useMemo(() => cityOptions(concerthalls, prefs, city), [prefs, city])
  const stations = useMemo(
    () => stationOptions(concerthalls, prefs, city, station),
    [prefs, city, station],
  )

  const { filtered, unknownExcluded, unknownFields } = useMemo(() => {
    const result = filterHalls(concerthalls, {
      query,
      prefs,
      city,
      station,
      walk,
      hallTypes,
      seats,
      stageW,
      stageD,
      equip,
      showClosed,
    })
    return { ...result, filtered: sortHalls(result.filtered, sortKey, sortAsc) }
  }, [
    query,
    prefs,
    city,
    station,
    walk,
    hallTypes,
    seats,
    stageW,
    stageD,
    equip,
    showClosed,
    sortKey,
    sortAsc,
  ])

  // リストは1施設1枚のカードにまとめる。並びは絞り込み・並び替えを終えたホールの順を保つ
  const groups = useMemo(() => groupByFacility(filtered), [filtered])
  // 地図はこの配列が変わるたびにピンを置き直すので、描画ごとに作り直さない
  const mapFacilities = useMemo(() => dedupeByFacility(filtered), [filtered])

  const sortTh = (k: HallSortKey, label: string, numeric?: boolean) => (
    <SortableTh
      k={k}
      label={label}
      sortKey={sortKey}
      sortAsc={sortAsc}
      onToggle={toggleSort}
      numeric={numeric}
    />
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
          {prefChoices.map(pref => {
            const on = prefs.includes(pref)
            return (
              <button
                key={pref}
                type="button"
                data-pref={pref}
                aria-pressed={on}
                // 府県を変えると選べる市区町村・最寄駅が変わるので、選択済みのものは落とす
                onClick={() => update({ prefs: toggleIn(prefs, pref), city: '', station: '' })}
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
            groups={cities}
            // 市区町村を変えると選べる駅も変わる（→ 府県・市区町村・駅の順に狭める）
            onChange={v => update({ city: v, station: '' })}
          />
          <FilterSelect
            label="最寄駅"
            placeholder="最寄駅（すべて）"
            value={station}
            groups={stations}
            onChange={v => update({ station: v })}
          />
        </FilterRow>

        {equipChoices.length > 0 && (
          <FilterRow label="EQUIPMENT" title="設備">
            {equipChoices.map(({ key, label }) => {
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
        )}

        <ClosedToggle
          on={showClosed}
          count={closedCount}
          onToggle={() => update({ showClosed: !showClosed })}
        />

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
          <BoundInput
            label="WALK"
            title="最寄駅徒歩"
            suffix="分以内"
            value={walk}
            onChange={v => update({ walk: v })}
          />
        </div>
      </FilterPanel>

      <ViewToggle
        view={view}
        onChangeView={v => update({ view: v })}
        count={filtered.length}
        unit="ホール"
        note={`${groups.length}施設`}
      />

      <UnknownNotice count={unknownExcluded} fields={unknownFields} />

      {view === 'list' && (
        <div className="facility-list">
          {groups.map(g => {
            const [h] = g
            const multi = g.length > 1
            const varies = rentalVariesByHall(g)
            return (
              <FacilityCard
                key={h.ID}
                // 複数ホールの施設では部屋名を施設名の横に出さない（数値の欄の上に出る）。
                // 貸館の状態がホールごとに違えば、施設名の横でなくホールの行に出す
                facility={{
                  ...h,
                  部屋名: multi ? undefined : h.部屋名,
                  貸館: varies ? undefined : h.貸館,
                }}
                detailPath={`/concert/${h.ID}`}
                stats={
                  multi ? (
                    <HallStats halls={g} showRental={varies} />
                  ) : (
                    <>
                      <Stat values={[h.客席数]} unit="席" caption="CAPACITY" />
                      <Stat
                        values={[h.舞台幅, h.舞台奥行]}
                        unit="m"
                        caption="STAGE W×D"
                        align="right"
                      />
                    </>
                  )
                }
                // 設備は施設のどれかのホールにあれば出す（どのホールかは詳細ページの表で分かる）
                equip={
                  <>
                    <EquipBadge label="ピアノ" on={g.some(x => x.ピアノ有無 === true)} />
                    <EquipBadge label="オルガン" on={g.some(x => x.パイプオルガン === true)} />
                    <EquipBadge label="譜面台" on={g.some(x => x.譜面台貸出 === true)} />
                    <EquipBadge label="親子室" on={g.some(x => x.親子室 === true)} />
                    <EquipBadge label="駐車場" on={h.駐車場 != null && h.駐車場 > 0} />
                  </>
                }
              />
            )
          })}
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
                {sortTh('客席数', '客席数', true)}
                <th scope="col" className="is-num">
                  舞台(W×D m)
                </th>
                {sortTh('最寄駅徒歩', '徒歩(分)', true)}
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
                <tr key={h.キー} data-pref={h.都道府県}>
                  <td className="data-table__name">
                    <Link to={`/concert/${h.ID}`} className="data-table__link">
                      {h.施設名}
                    </Link>
                    {h.部屋名 && <span className="data-table__room">（{h.部屋名}）</span>}
                    <RentalBadge 貸館={h.貸館} />
                    <UsageConditionBadge 利用条件={h.利用条件} />
                  </td>
                  <td className="is-nowrap">
                    <span className="pref-chip">{h.都道府県}</span>
                  </td>
                  <td className="data-table__sub is-nowrap">{h.市区町村}</td>
                  <td className="is-num">
                    <TableNum values={[h.客席数]} />
                  </td>
                  <td className="is-num">
                    <TableNum values={[h.舞台幅, h.舞台奥行]} />
                  </td>
                  <td className="is-num">
                    <TableNum values={[minWalk(h) < NO_WALK ? minWalk(h) : undefined]} />
                  </td>
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
          <FacilityMap facilities={mapFacilities} detailPath={f => `/concert/${f.ID}`} />
        </Suspense>
      )}
    </div>
  )
}
