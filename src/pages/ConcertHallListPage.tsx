import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { concerthalls } from '../data'
import type { ConcertHall } from '../types'
import FacilityMap from '../components/FacilityMap'

type ViewMode = 'list' | 'table' | 'map'
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
    let list = concerthalls.filter(h => {
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

    list.sort((a, b) => {
      let av: any, bv: any
      if (sortKey === '施設名') { av = a.施設名; bv = b.施設名 }
      else if (sortKey === '都道府県') { av = a.都道府県; bv = b.都道府県 }
      else if (sortKey === '客席数') { av = a.客席数 ?? -1; bv = b.客席数 ?? -1 }
      else { av = a.最寄駅徒歩 ?? 999; bv = b.最寄駅徒歩 ?? 999 }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })
    return list
  }, [query, filterPref, filterCity, filterLine, filterWalk, filterSeatsMin, filterSeatsMax,
    filterPiano, filterOrgan, filterStand, filterFamily, filterParking, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  function SortTh({ k, label }: { k: SortKey; label: string }) {
    return (
      <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => toggleSort(k)}>
        {label}{sortKey === k ? (sortAsc ? ' ▲' : ' ▼') : ''}
      </th>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-navy-700 mb-6 pb-2 border-b-2 border-gold-500">コンサートホール一覧</h1>

      {/* フィルター */}
      <details className="mb-4 border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
        <summary className="cursor-pointer font-medium text-navy-700">絞り込み・検索</summary>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
            {([['filterPiano', filterPiano, setFilterPiano, 'ピアノあり'],
               ['filterOrgan', filterOrgan, setFilterOrgan, 'パイプオルガンあり'],
               ['filterStand', filterStand, setFilterStand, '譜面台貸出あり'],
               ['filterFamily', filterFamily, setFilterFamily, '親子室あり'],
               ['filterParking', filterParking, setFilterParking, '駐車場あり'],
            ] as [string, boolean, (v: boolean) => void, string][]).map(([key, val, set, label]) => (
              <label key={key} className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </details>

      {/* 表示切替・ソート */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="text-sm text-gray-500">{filtered.length} 件</span>
        <div className="flex gap-2">
          {(['list', 'table', 'map'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${view === v ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-gray-600 border-gray-300 hover:border-navy-700 hover:text-navy-700'}`}>
              {v === 'list' ? 'リスト' : v === 'table' ? '表' : '地図'}
            </button>
          ))}
        </div>
      </div>

      {/* リスト表示 */}
      {view === 'list' && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="text-gray-500">並び替え:</span>
          {(['施設名', '都道府県', '客席数', '最寄駅徒歩'] as SortKey[]).map(k => (
            <button key={k} onClick={() => toggleSort(k)}
              className={`px-2 py-0.5 rounded-full border text-xs transition-colors ${sortKey === k ? 'bg-navy-700 text-white border-navy-700' : 'border-gray-300 hover:border-navy-700 hover:text-navy-700'}`}>
              {k}{sortKey === k ? (sortAsc ? ' ▲' : ' ▼') : ''}
            </button>
          ))}
        </div>
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
                <SortTh k="施設名" label="施設名" />
                <SortTh k="都道府県" label="都道府県" />
                <th className="px-3 py-2 text-left whitespace-nowrap">市区町村</th>
                <SortTh k="客席数" label="客席数" />
                <SortTh k="最寄駅徒歩" label="徒歩(分)" />
                <th className="px-3 py-2 text-left">ピアノ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => (
                <tr key={h.ID} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link to={`/concert/${h.ID}`} className="text-blue-600 hover:underline">
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
