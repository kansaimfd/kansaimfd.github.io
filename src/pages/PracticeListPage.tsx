import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { practices } from '../datasets/practices'
import { NO_WALK, minWalk } from '../station'
import { cityOptions, equipOptions, prefOptions, stationOptions } from '../options'
import { toggleIn, toggleKey } from '../toggle'
import useDocumentTitle from '../useDocumentTitle'
import useListState from '../useListState'
import { isClosed } from '../rental'
import {
  PRACTICE_EQUIP_FIELDS,
  PRACTICE_SORT_KEYS,
  filterPractices,
  knownArea,
  knownCapacity,
  maxArea,
  maxCapacity,
  practiceDetailPath,
  practiceStateFromParams,
  practiceStateToParams,
  sortPractices,
  type PracticePageState,
  type PracticeSortKey,
} from '../practice'
import ListLayout from '../components/ListLayout'
import CardList from '../components/CardList'
import DataTable from '../components/DataTable'
import MapView from '../components/MapView'
import FilterRow from '../components/FilterRow'
import PrefPills from '../components/PrefPills'
import EquipPills from '../components/EquipPills'
import FilterSelect from '../components/FilterSelect'
import BoundInput from '../components/BoundInput'
import FacilityCard from '../components/FacilityCard'
import Stat from '../components/Stat'
import EquipBadge from '../components/EquipBadge'
import SortableTh from '../components/SortableTh'
import AvailabilityMark from '../components/AvailabilityMark'
import TableNum from '../components/TableNum'
import RentalBadge from '../components/RentalBadge'
import UsageConditionBadge from '../components/UsageConditionBadge'
import ClosedToggle from '../components/ClosedToggle'

/** 1件も入っていないうちは、必ず0件になる絞り込みを見せない */
const hasCapacityData = practices.some(p => knownCapacity(p) != null)
const hasAreaData = practices.some(p => knownArea(p) != null)

const closedCount = practices.filter(p => isClosed(p.貸館)).length

export default function PracticeListPage() {
  useDocumentTitle('練習場一覧')

  /**
   * 一覧の状態はURLが持つ。**`useState` に持たない。**
   * 絞り込んだ結果をそのまま人に送れて、詳細ページから戻っても条件が残る。
   */
  const { state, update, toggleSort } = useListState<PracticeSortKey, PracticePageState>(
    practiceStateFromParams,
    practiceStateToParams,
  )
  const {
    query,
    prefs,
    city,
    capacity,
    area,
    station,
    walk,
    equip,
    showClosed,
    view,
    sortKey,
    sortAsc,
  } = state

  // 府県・市区町村・最寄駅・設備の選択肢（→ options.ts）。
  // データが1件も無い府県・設備は出さない。必ず0件になる絞り込みを見せないため
  const prefChoices = useMemo(() => prefOptions(practices), [])
  const equipChoices = useMemo(() => equipOptions(PRACTICE_EQUIP_FIELDS, practices), [])
  const cities = useMemo(() => cityOptions(practices, prefs, city), [prefs, city])
  const stations = useMemo(
    () => stationOptions(practices, prefs, city, station),
    [prefs, city, station],
  )

  const { filtered, unknownExcluded, unknownFields } = useMemo(() => {
    const result = filterPractices(practices, {
      query,
      prefs,
      city,
      capacity,
      area,
      station,
      walk,
      equip,
      showClosed,
    })
    return { ...result, filtered: sortPractices(result.filtered, sortKey, sortAsc) }
  }, [query, prefs, city, capacity, area, station, walk, equip, showClosed, sortKey, sortAsc])

  const sortTh = (k: PracticeSortKey, label: string, numeric?: boolean) => (
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
      eyebrow="REHEARSAL ROOMS"
      title="練習場一覧"
      lead="関西の練習場を定員・設備・アクセスで比較。ホールに併設された練習室・リハーサル室も含みます"
      query={query}
      onQuery={v => update({ query: v }, true)}
      sortKeys={PRACTICE_SORT_KEYS}
      sortKey={sortKey}
      sortAsc={sortAsc}
      onSort={(key, asc) => update({ sortKey: key, sortAsc: asc })}
      view={view}
      onChangeView={v => update({ view: v })}
      count={filtered.length}
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
            {hasCapacityData && (
              <BoundInput
                label="CAPACITY"
                title="定員"
                suffix="名以上"
                value={capacity}
                onChange={v => update({ capacity: v })}
              />
            )}
            {hasAreaData && (
              <BoundInput
                label="AREA"
                title="面積"
                suffix="㎡以上"
                value={area}
                onChange={v => update({ area: v })}
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
        </>
      }
    >
      {view === 'list' && (
        <CardList count={filtered.length}>
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
        </CardList>
      )}

      {view === 'table' && (
        <DataTable
          caption={`練習場の一覧（${filtered.length}件）`}
          columns={9}
          count={filtered.length}
          head={
            <tr>
              {sortTh('施設名', '施設名')}
              {sortTh('都道府県', '都道府県')}
              <th scope="col">市区町村</th>
              <th scope="col" className="is-num">
                最大定員
              </th>
              <th scope="col" className="is-num">
                最大面積(㎡)
              </th>
              {sortTh('最寄駅徒歩', '徒歩(分)', true)}
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
          }
        >
          {filtered.map(p => (
            <tr key={practiceDetailPath(p)} data-pref={p.都道府県}>
              <td className="data-table__name">
                <Link to={practiceDetailPath(p)} className="data-table__link">
                  {p.施設名}
                </Link>
                <RentalBadge 貸館={p.貸館} />
                <UsageConditionBadge 利用条件={p.利用条件} />
                {p.ホール併設 && <span className="data-table__tag">ホール併設</span>}
              </td>
              <td className="is-nowrap">
                <span className="pref-chip">{p.都道府県}</span>
              </td>
              <td className="data-table__sub is-nowrap">{p.市区町村}</td>
              <td className="is-num">
                <TableNum values={[maxCapacity(p) || undefined]} />
              </td>
              <td className="is-num">
                <TableNum values={[maxArea(p) || undefined]} />
              </td>
              <td className="is-num">
                <TableNum values={[minWalk(p) < NO_WALK ? minWalk(p) : undefined]} />
              </td>
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
        </DataTable>
      )}

      {view === 'map' && <MapView facilities={filtered} detailPath={practiceDetailPath} />}
    </ListLayout>
  )
}
