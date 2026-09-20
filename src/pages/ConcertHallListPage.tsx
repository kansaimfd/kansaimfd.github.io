import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { concerthalls } from '../datasets/concerthalls'
import { NO_WALK, minWalk } from '../station'
import { cityOptions, equipOptions, prefOptions, stationOptions } from '../options'
import { toggleIn, toggleKey } from '../toggle'
import useDocumentTitle from '../useDocumentTitle'
import useListState from '../useListState'
import { isClosed } from '../rental'
import {
  HALL_EQUIP_FIELDS,
  HALL_SORT_KEYS,
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
import ListLayout from '../components/ListLayout'
import CardList from '../components/CardList'
import DataTable from '../components/DataTable'
import MapView from '../components/MapView'
import FilterRow from '../components/FilterRow'
import PrefPills from '../components/PrefPills'
import EquipPills from '../components/EquipPills'
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
import ClosedToggle from '../components/ClosedToggle'

/**
 * URLから一覧の状態を読む。**モジュールの定数にしてある**（→ useListState）。
 *
 * **ホール種別の絞り込みは画面から外してある**（区分の用途を整理し直すまで）。
 * 「多目的」が多目的室を連想させ、オーケストラを想定した劇場型ホールと
 * 区別できないため。データと `filterHalls` 側は残してある。
 * URLに `type=` が残っていても効かせない。見えない条件で絞ると
 * 「なぜか件数が少ない」画面になり、書き戻すときにも落ちる
 */
const stateFromParams = (params: URLSearchParams): HallPageState => ({
  ...hallStateFromParams(params),
  hallTypes: [],
})

const closedCount = concerthalls.filter(h => isClosed(h.貸館)).length

export default function ConcertHallListPage() {
  useDocumentTitle('コンサートホール一覧')

  /**
   * 一覧の状態はURLが持つ。**`useState` に持たない。**
   * 絞り込んだ結果をそのまま人に送れて、詳細ページから戻っても条件が残る。
   */
  const { state, update, toggleSort } = useListState<HallSortKey, HallPageState>(
    stateFromParams,
    hallStateToParams,
  )
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
    <ListLayout
      eyebrow="CONCERT HALLS"
      title="コンサートホール一覧"
      lead="関西のホールを客席数・設備・アクセスで比較"
      query={query}
      onQuery={v => update({ query: v }, true)}
      sortKeys={HALL_SORT_KEYS}
      sortKey={sortKey}
      sortAsc={sortAsc}
      onSort={(key, asc) => update({ sortKey: key, sortAsc: asc })}
      view={view}
      onChangeView={v => update({ view: v })}
      count={filtered.length}
      unit="ホール"
      note={`${groups.length}施設`}
      unknown={{ count: unknownExcluded, fields: unknownFields }}
      filters={
        <>
          <PrefPills
            choices={prefChoices}
            selected={prefs}
            // 府県を変えると選べる市区町村・最寄駅が変わるので、選択済みのものは落とす
            onToggle={pref => update({ prefs: toggleIn(prefs, pref), city: '', station: '' })}
          />

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

          <EquipPills
            choices={equipChoices}
            selected={equip}
            onToggle={key => update({ equip: toggleKey(equip, key) })}
          />

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
        </>
      }
    >
      {view === 'list' && (
        <CardList count={filtered.length}>
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
        </CardList>
      )}

      {view === 'table' && (
        <DataTable
          caption={`コンサートホールの一覧（${filtered.length}件）`}
          columns={8}
          count={filtered.length}
          head={
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
          }
        >
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
        </DataTable>
      )}

      {view === 'map' && (
        <MapView facilities={mapFacilities} detailPath={f => `/concert/${f.ID}`} />
      )}
    </ListLayout>
  )
}
