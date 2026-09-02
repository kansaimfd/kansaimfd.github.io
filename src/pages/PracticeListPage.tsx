import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { practices } from '../data'
import type { Practice } from '../types'
import { NO_WALK, minWalk, stationNames, walkLabel } from '../station'
import { availabilityMark } from '../availability'
import { fullAddress } from '../address'
import { compareByName } from '../name'
import FacilityMap from '../components/FacilityMap'
import ViewToggle, { type ViewMode } from '../components/ViewToggle'
import SortBar from '../components/SortBar'
import SortableTh from '../components/SortableTh'
import FilterPanel from '../components/FilterPanel'
import RentalBadge from '../components/RentalBadge'

type SortKey = '施設名' | '都道府県' | '最寄駅徒歩'

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
function maxCapacity(p: Practice): number {
  return Math.max(0, ...(p.部屋?.map(r => r.定員 ?? 0) ?? []))
}

/** 定員が1件も入っていないうちは、必ず0件になる絞り込みを見せない */
const hasCapacityData = practices.some(p => maxCapacity(p) > 0)

const EQUIP_FILTERS = [
  {
    key: 'piano', label: 'ピアノあり', unknownLabel: 'ピアノの有無',
    state: (p: Practice) => facilityState([p.ピアノ有無, ...(p.部屋?.map(r => r.ピアノ有無) ?? [])]),
  },
  {
    key: 'wind', label: '管楽器可', unknownLabel: '管楽器の可否',
    state: (p: Practice) => facilityState(p.部屋?.map(r => r.管楽器) ?? []),
  },
  {
    key: 'perc', label: '打楽器可', unknownLabel: '打楽器の可否',
    state: (p: Practice) => facilityState(p.部屋?.map(r => r.打楽器) ?? []),
  },
] as const

export default function PracticeListPage() {
  const [view, setView] = useState<ViewMode>('list')
  const [query, setQuery] = useState('')
  const [filterPref, setFilterPref] = useState('')
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
    []
  )

  const prefs = useMemo(() => unique(practices.map(p => p.都道府県)), [])
  const cities = useMemo(
    () => unique(practices.filter(p => !filterPref || p.都道府県 === filterPref).map(p => p.市区町村)),
    [filterPref]
  )
  const stations = useMemo(() => unique(practices.flatMap(stationNames)), [])

  const { filtered, unknownExcluded } = useMemo(() => {
    // ピアノ以外の条件で先に絞る。ピアノは未調査による除外数を数えるため別段にする
    const base = practices.filter(p => {
      if (filterPref && p.都道府県 !== filterPref) return false
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
    const excluded = active.length === 0 ? 0 : base.filter(p =>
      !list.includes(p) && active.some(e => e.state(p) === undefined)
    ).length

    const sorted = [...list].sort((a, b) => {
      // 施設名は五十音順（コードポイント順だと 100BAN→7th Note→KOKO PLAZA→アイホール になる）
      if (sortKey === '施設名') return (sortAsc ? 1 : -1) * compareByName(a, b)
      let av: string | number, bv: string | number
      if (sortKey === '都道府県') { av = a.都道府県; bv = b.都道府県 }
      else { av = minWalk(a); bv = minWalk(b) }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })

    return { filtered: sorted, unknownExcluded: excluded }
  }, [query, filterPref, filterCity, filterCapacity, filterStation, filterWalk, filterEquip, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const sortTh = (k: SortKey, label: string) => (
    <SortableTh k={k} label={label} sortKey={sortKey} sortAsc={sortAsc} onToggle={toggleSort} />
  )

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-navy-700 mb-6 pb-2 border-b-2 border-gold-500">練習場一覧</h1>

      <FilterPanel>
        <input
          type="text"
          placeholder="フリーワード検索"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm col-span-full"
        />
        <select value={filterPref} onChange={e => { setFilterPref(e.target.value); setFilterCity('') }} className="border rounded px-2 py-1.5 text-sm">
          <option value="">都道府県（すべて）</option>
          {prefs.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
          <option value="">市区町村（すべて）</option>
          {cities.map(c => <option key={c}>{c}</option>)}
        </select>
        {hasCapacityData && (
          <div className="flex items-center gap-2 text-sm">
            <label>定員</label>
            <input type="number" min={0} value={filterCapacity} onChange={e => setFilterCapacity(e.target.value)} className="border rounded w-16 px-2 py-1.5" placeholder="〜" />
            <span>名以上</span>
          </div>
        )}
        <select value={filterStation} onChange={e => setFilterStation(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
          <option value="">最寄駅（すべて）</option>
          {stations.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm">
          <label>徒歩</label>
          <input type="number" min={0} value={filterWalk} onChange={e => setFilterWalk(e.target.value)} className="border rounded w-16 px-2 py-1.5" placeholder="〜" />
          <span>分以内</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap col-span-full">
          {equipOptions.map(e => (
            <label key={e.key} className="flex items-center gap-1 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={filterEquip.has(e.key)}
                onChange={() => setFilterEquip(prev => {
                  const next = new Set(prev)
                  if (next.has(e.key)) next.delete(e.key)
                  else next.add(e.key)
                  return next
                })}
              />
              {e.label}
            </label>
          ))}
        </div>
      </FilterPanel>

      <ViewToggle view={view} onChangeView={setView} count={filtered.length} />

      {unknownExcluded > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mb-4 text-xs text-amber-800 leading-relaxed">
          <span aria-hidden>⚠</span>
          <span>
            {EQUIP_FILTERS.filter(e => filterEquip.has(e.key)).map(e => e.unknownLabel).join('・')}
            が<strong>未調査</strong>の {unknownExcluded} 件を絞り込みから除外しています。
            「ない」と確認できたわけではないため、実際には条件に合う施設が含まれている可能性があります。
          </span>
        </div>
      )}

      {view === 'list' && (
        <SortBar
          keys={['施設名', '都道府県', '最寄駅徒歩'] as SortKey[]}
          sortKey={sortKey}
          sortAsc={sortAsc}
          onToggle={toggleSort}
        />
      )}

      {view === 'list' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => <PracticeCard key={p.ID} practice={p} />)}
          {filtered.length === 0 && <p className="text-gray-400 col-span-full">該当する施設がありません</p>}
        </div>
      )}

      {view === 'table' && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {sortTh('施設名', '施設名')}
                {sortTh('都道府県', '都道府県')}
                <th className="px-3 py-2 text-left whitespace-nowrap">市区町村</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">最大定員</th>
                {sortTh('最寄駅徒歩', '徒歩(分)')}
                <th className="px-3 py-2 text-left">ピアノ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.ID} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link to={`/practice/${p.ID}`} className="text-navy-700 hover:text-gold-500 hover:underline">{p.施設名}</Link>
                    <RentalBadge 貸館={p.貸館} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.都道府県}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.市区町村}</td>
                  <td className="px-3 py-2 text-right">{maxCapacity(p) > 0 ? maxCapacity(p) : '—'}</td>
                  <td className="px-3 py-2 text-right">{minWalk(p) < NO_WALK ? minWalk(p) : '—'}</td>
                  <td className="px-3 py-2 text-center">{availabilityMark(EQUIP_FILTERS[0].state(p))}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-gray-400 text-center">該当する施設がありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'map' && <FacilityMap facilities={filtered} detailBasePath="/practice" />}
    </div>
  )
}

function PracticeCard({ practice: p }: { practice: Practice }) {
  return (
    <Link to={`/practice/${p.ID}`} className="block border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-gold-500 transition-all bg-white group">
      <p className="font-serif font-semibold text-navy-700 group-hover:text-gold-600 transition-colors">{p.施設名}<RentalBadge 貸館={p.貸館} /></p>
      <p className="text-sm text-gray-500 mt-1">{p.都道府県} {p.市区町村}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {p.最寄駅?.slice(0, 1).map((s, i) => (
          <span key={i} className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{[s.駅, walkLabel(s)].filter(Boolean).join(' ')}</span>
        ))}
        {EQUIP_FILTERS.filter(e => e.state(p) === true).map(e => (
          <span key={e.key} className="bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">
            {e.label.replace(/(あり|可)$/, '')}
          </span>
        ))}
      </div>
    </Link>
  )
}
