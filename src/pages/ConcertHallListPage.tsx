import { useState, useMemo, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { concerthalls } from '../datasets/concerthalls'
import type { ConcertHall, HallType } from '../types'
import { NO_WALK, minWalk } from '../station'
import { availabilityMark, hasEquipment } from '../availability'
import { fullAddress } from '../address'
import { compareByName } from '../name'
import { ALL_PREFS } from '../pref'
import useDocumentTitle from '../useDocumentTitle'
import ViewToggle, { type ViewMode } from '../components/ViewToggle'
import SortSelect, { type SortOption } from '../components/SortSelect'
import FilterPanel from '../components/FilterPanel'
import FilterRow from '../components/FilterRow'
import RangeInput from '../components/RangeInput'
import FacilityCard from '../components/FacilityCard'
import Stat from '../components/Stat'
import EquipBadge from '../components/EquipBadge'
import SortableTh from '../components/SortableTh'
import RentalBadge from '../components/RentalBadge'
import UsageConditionBadge from '../components/UsageConditionBadge'

// 地図は leaflet を引き込むので、地図表示に切り替えるまで読み込まない
const FacilityMap = lazy(() => import('../components/FacilityMap'))

type SortKey = '施設名' | '都道府県' | '客席数' | '最寄駅徒歩'

// 表の見出しからも並び替えられるので、どのキーも昇順・降順の両方を載せる
const SORT_OPTIONS: SortOption<SortKey>[] = [
  { key: '施設名', asc: true, label: '施設名（昇順）' },
  { key: '施設名', asc: false, label: '施設名（降順）' },
  { key: '都道府県', asc: true, label: '都道府県（昇順）' },
  { key: '都道府県', asc: false, label: '都道府県（降順）' },
  { key: '客席数', asc: false, label: '客席数（多い順）' },
  { key: '客席数', asc: true, label: '客席数（少ない順）' },
  { key: '最寄駅徒歩', asc: true, label: '最寄駅徒歩（近い順）' },
  { key: '最寄駅徒歩', asc: false, label: '最寄駅徒歩（遠い順）' },
]

const ALL_HALL_TYPES: HallType[] = ['音楽専用', '多目的', '小ホール・サロン']

/** 3値（あり/なし/未調査）を持つ設備。駐車場は台数なのでここには含めない */
const EQUIP_FIELDS = [
  { key: 'piano', label: 'ピアノあり', pick: (h: ConcertHall) => h.ピアノ有無 },
  { key: 'organ', label: 'パイプオルガンあり', pick: (h: ConcertHall) => h.パイプオルガン },
  { key: 'stand', label: '譜面台貸出あり', pick: (h: ConcertHall) => h.譜面台貸出 },
  { key: 'family', label: '親子室あり', pick: (h: ConcertHall) => h.親子室 },
] as const

const EQUIP_OPTIONS = [
  ...EQUIP_FIELDS.map(({ key, label }) => ({ key, label })),
  { key: 'parking', label: '駐車場あり' },
]

/** 平坦化された一覧は同一施設の複数ホールを含むため、地図では施設ごと1マーカーにまとめる */
function dedupeByFacility(halls: ConcertHall[]): ConcertHall[] {
  const seen = new Map<number, ConcertHall>()
  for (const h of halls) if (!seen.has(h.ID)) seen.set(h.ID, h)
  return [...seen.values()]
}

export default function ConcertHallListPage() {
  useDocumentTitle('コンサートホール一覧')

  const [view, setView] = useState<ViewMode>('list')
  const [query, setQuery] = useState('')
  const [filterPrefs, setFilterPrefs] = useState<string[]>([])
  const [filterEquip, setFilterEquip] = useState<Set<string>>(new Set())
  const [filterHallTypes, setFilterHallTypes] = useState<HallType[]>([])
  const [filterSeats, setFilterSeats] = useState<[string, string]>(['', ''])
  const [filterStageW, setFilterStageW] = useState<[string, string]>(['', ''])
  const [filterStageD, setFilterStageD] = useState<[string, string]>(['', ''])
  const [sortKey, setSortKey] = useState<SortKey>('施設名')
  const [sortAsc, setSortAsc] = useState(true)

  // データが1件も無い種別は選択肢に出さない。必ず0件になる絞り込みを見せないため
  const hallTypeOptions = useMemo(
    () => ALL_HALL_TYPES.filter(t => concerthalls.some(h => h.ホール種別 === t)),
    [],
  )

  const { filtered, unknownExcluded } = useMemo(() => {
    // 設備以外の条件で先に絞る。設備は未調査による除外数を数えるため別段にする
    const base = concerthalls.filter(h => {
      if (filterPrefs.length > 0 && !filterPrefs.includes(h.都道府県)) return false
      if (
        filterHallTypes.length > 0 &&
        (h.ホール種別 == null || !filterHallTypes.includes(h.ホール種別))
      )
        return false
      if (filterSeats[0] && (h.客席数 == null || h.客席数 < Number(filterSeats[0]))) return false
      if (filterSeats[1] && (h.客席数 == null || h.客席数 > Number(filterSeats[1]))) return false
      if (filterStageW[0] && (h.舞台幅 == null || h.舞台幅 < Number(filterStageW[0]))) return false
      if (filterStageW[1] && (h.舞台幅 == null || h.舞台幅 > Number(filterStageW[1]))) return false
      if (filterStageD[0] && (h.舞台奥行 == null || h.舞台奥行 < Number(filterStageD[0])))
        return false
      if (filterStageD[1] && (h.舞台奥行 == null || h.舞台奥行 > Number(filterStageD[1])))
        return false
      if (query) {
        const q = query.toLowerCase()
        const text = `${h.施設名}${h.部屋名 ?? ''}${fullAddress(h)}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })

    const activeEquip = EQUIP_FIELDS.filter(e => filterEquip.has(e.key))
    const list = base.filter(h => {
      if (filterEquip.has('parking') && !(h.駐車場 != null && h.駐車場 > 0)) return false
      return activeEquip.every(e => hasEquipment(e.pick(h)))
    })

    // 「設備なし」ではなく「未調査」のせいで消えた件数。黙って消さず利用者に開示する
    const shown = new Set(list)
    const excluded =
      activeEquip.length === 0
        ? 0
        : base.filter(h => !shown.has(h) && activeEquip.some(e => e.pick(h) === undefined)).length

    const sorted = [...list].sort((a, b) => {
      // 施設名は五十音順（コードポイント順だと 100BAN→7th Note→KOKO PLAZA→アイホール になる）
      if (sortKey === '施設名') return (sortAsc ? 1 : -1) * compareByName(a, b)
      let av: string | number, bv: string | number
      if (sortKey === '都道府県') {
        av = a.都道府県
        bv = b.都道府県
      } else if (sortKey === '客席数') {
        av = a.客席数 ?? -1
        bv = b.客席数 ?? -1
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
    filterHallTypes,
    filterSeats,
    filterStageW,
    filterStageD,
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
        <p className="page-head__eyebrow">CONCERT HALLS</p>
        <h1 className="page-head__title">コンサートホール一覧</h1>
        <p className="page-head__lead">関西6府県のホールを客席数・設備・アクセスで比較</p>
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
          {ALL_PREFS.map(pref => {
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

        {hallTypeOptions.length > 0 && (
          <FilterRow label="HALL TYPE" title="ホール種別">
            {hallTypeOptions.map(t => {
              const on = filterHallTypes.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setFilterHallTypes(prev =>
                      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t],
                    )
                  }
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
          {EQUIP_OPTIONS.map(({ key, label }) => {
            const on = filterEquip.has(key)
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleEquip(key)}
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
            value={filterSeats}
            onChange={setFilterSeats}
          />
          <RangeInput
            label="STAGE WIDTH"
            title="舞台幅"
            unit="m"
            value={filterStageW}
            onChange={setFilterStageW}
          />
          <RangeInput
            label="STAGE DEPTH"
            title="舞台奥行き"
            unit="m"
            value={filterStageD}
            onChange={setFilterStageD}
          />
        </div>
      </FilterPanel>

      <ViewToggle view={view} onChangeView={setView} count={filtered.length} />

      {unknownExcluded > 0 && (
        <div className="notice notice--warn">
          <span aria-hidden>⚠</span>
          <span>
            設備が<strong>未調査</strong>の {unknownExcluded} 件を絞り込みから除外しています。
            設備が「ない」と確認できたわけではないため、実際には条件に合う施設が含まれている可能性があります。
          </span>
        </div>
      )}

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
            <thead>
              <tr>
                {sortTh('施設名', '施設名')}
                {sortTh('都道府県', '都道府県')}
                <th>市区町村</th>
                {sortTh('客席数', '客席数')}
                <th>舞台(W×D)</th>
                {sortTh('最寄駅徒歩', '徒歩(分)')}
                <th className="is-center">ピアノ</th>
                <th className="is-center">オルガン</th>
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
                  <td className="is-center">{availabilityMark(h.ピアノ有無)}</td>
                  <td className="is-center">{availabilityMark(h.パイプオルガン)}</td>
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
