import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { concerthalls } from '../data'
import type { ConcertHall } from '../types'
import FacilityMap from '../components/FacilityMap'
import ViewToggle, { type ViewMode } from '../components/ViewToggle'
import SortBar from '../components/SortBar'
import SortableTh from '../components/SortableTh'
import FilterPanel from '../components/FilterPanel'

type SortKey = '施設名' | '都道府県' | '客席数' | '最寄駅徒歩'

const MARU = '〇'

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort() as T[]
}

export default function ConcertHallListPage() {
  const [view, setView] = useState<ViewMode>('list')
  const [query, setQuery] = useState('')
  const [filterPref, setFilterPref] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterLine, setFilterLine] = useState('')
  const [filterWalk, setFilterWalk] = useState('')
  const [filterSeatsMin, setFilterSeatsMin] = useState('')
  const [filterSeatsMax, setFilterSeatsMax] = useState('')
  const [filterPiano, setFilterPiano] = useState(false)
  const [filterOrgan, setFilterOrgan] = useState(false)
  const [filterStand, setFilterStand] = useState(false)
  const [filterFamily, setFilterFamily] = useState(false)
  const [filterParking, setFilterParking] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('施設名')
  const [sortAsc, setSortAsc] = useState(true)

  const prefs = useMemo(() => unique(concerthalls.map(h => h.都道府県)), [])
  const cities = useMemo(
    () => unique(concerthalls.filter(h => !filterPref || h.都道府県 === filterPref).map(h => h.市区町村)),
    [filterPref]
  )
  const lines = useMemo(() => unique(concerthalls.map(h => h.最寄駅路線).filter(Boolean) as string[]), [])

  const filtered = useMemo(() => {
    const list = concerthalls.filter(h => {
      if (filterPref && h.都道府県 !== filterPref) return false
      if (filterCity && h.市区町村 !== filterCity) return false
      if (filterLine && h.最寄駅路線 !== filterLine) return false
      if (filterWalk && (h.最寄駅徒歩 == null || h.最寄駅徒歩 > Number(filterWalk))) return false
      if (filterSeatsMin && (h.客席数 == null || h.客席数 < Number(filterSeatsMin))) return false
      if (filterSeatsMax && (h.客席数 == null || h.客席数 > Number(filterSeatsMax))) return false
      if (filterPiano && h.ピアノ有無 !== MARU) return false
      if (filterOrgan && h.パイプオルガン !== MARU) return false
      if (filterStand && h.譜面台貸出 !== MARU) return false
      if (filterFamily && h.親子室 !== MARU) return false
      if (filterParking && !(h.駐車場 != null && h.駐車場 > 0)) return false
      if (query) {
        const q = query.toLowerCase()
        const text = `${h.施設名}${h.部屋名 ?? ''}${h.都道府県}${h.市区町村}${h.番地以下}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })

    return [...list].sort((a, b) => {
      let av: any, bv: any
      if (sortKey === '施設名') { av = a.施設名; bv = b.施設名 }
      else if (sortKey === '都道府県') { av = a.都道府県; bv = b.都道府県 }
      else if (sortKey === '客席数') { av = a.客席数 ?? -1; bv = b.客席数 ?? -1 }
      else { av = a.最寄駅徒歩 ?? 999; bv = b.最寄駅徒歩 ?? 999 }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })
  }, [query, filterPref, filterCity, filterLine, filterWalk, filterSeatsMin, filterSeatsMax,
    filterPiano, filterOrgan, filterStand, filterFamily, filterParking, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const sortTh = (k: SortKey, label: string) => (
    <SortableTh k={k} label={label} sortKey={sortKey} sortAsc={sortAsc} onToggle={toggleSort} />
  )

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-navy-700 mb-6 pb-2 border-b-2 border-gold-500">コンサートホール一覧</h1>

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
        <select value={filterLine} onChange={e => setFilterLine(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
          <option value="">最寄駅路線（すべて）</option>
          {lines.map(l => <option key={l}>{l}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm">
          <label>徒歩</label>
          <input type="number" min={0} value={filterWalk} onChange={e => setFilterWalk(e.target.value)} className="border rounded w-16 px-2 py-1.5" placeholder="〜" />
          <span>分以内</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label>客席数</label>
          <input type="number" min={0} value={filterSeatsMin} onChange={e => setFilterSeatsMin(e.target.value)} className="border rounded w-20 px-2 py-1.5" placeholder="下限" />
          <span>〜</span>
          <input type="number" min={0} value={filterSeatsMax} onChange={e => setFilterSeatsMax(e.target.value)} className="border rounded w-20 px-2 py-1.5" placeholder="上限" />
        </div>
        <div className="flex flex-wrap gap-3 text-sm col-span-full">
          {([
            [filterPiano, setFilterPiano, 'ピアノあり'],
            [filterOrgan, setFilterOrgan, 'パイプオルガンあり'],
            [filterStand, setFilterStand, '譜面台貸出あり'],
            [filterFamily, setFilterFamily, '親子室あり'],
            [filterParking, setFilterParking, '駐車場あり'],
          ] as [boolean, (v: boolean) => void, string][]).map(([val, set, label]) => (
            <label key={label} className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      </FilterPanel>

      <ViewToggle view={view} onChangeView={setView} count={filtered.length} />

      {view === 'list' && (
        <SortBar
          keys={['施設名', '都道府県', '客席数', '最寄駅徒歩'] as SortKey[]}
          sortKey={sortKey}
          sortAsc={sortAsc}
          onToggle={toggleSort}
        />
      )}

      {view === 'list' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(h => <ConcertHallCard key={h.ID} hall={h} />)}
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
                {sortTh('客席数', '客席数')}
                {sortTh('最寄駅徒歩', '徒歩(分)')}
                <th className="px-3 py-2 text-left">ピアノ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => (
                <tr key={h.ID} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link to={`/concert/${h.ID}`} className="text-navy-700 hover:text-gold-500 hover:underline">
                      {h.施設名}{h.部屋名 ? `（${h.部屋名}）` : ''}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.都道府県}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.市区町村}</td>
                  <td className="px-3 py-2 text-right">{h.客席数 ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{h.最寄駅徒歩 ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{h.ピアノ有無 ?? '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-gray-400 text-center">該当する施設がありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'map' && <FacilityMap facilities={filtered} detailBasePath="/concert" />}
    </div>
  )
}

function ConcertHallCard({ hall: h }: { hall: ConcertHall }) {
  return (
    <Link to={`/concert/${h.ID}`} className="block border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-gold-500 transition-all bg-white group">
      <p className="font-serif font-semibold text-navy-700 leading-tight group-hover:text-gold-600 transition-colors">
        {h.施設名}{h.部屋名 ? <span className="font-sans font-normal text-gray-500 text-sm ml-1">（{h.部屋名}）</span> : ''}
      </p>
      <p className="text-sm text-gray-500 mt-1">{h.都道府県} {h.市区町村}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {h.客席数 != null && <span className="bg-navy-50 text-navy-700 rounded-full px-2 py-0.5">客席 {h.客席数}席</span>}
        {h.最寄駅 && <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{h.最寄駅}{h.最寄駅徒歩 != null ? ` 徒歩${h.最寄駅徒歩}分` : ''}</span>}
        {h.ピアノ有無 === '〇' && <span className="bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">ピアノ</span>}
        {h.パイプオルガン === '〇' && <span className="bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">パイプオルガン</span>}
      </div>
    </Link>
  )
}
