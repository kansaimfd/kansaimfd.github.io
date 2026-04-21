import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { practices } from '../data'
import type { Practice } from '../types'
import FacilityMap from '../components/FacilityMap'

type ViewMode = 'list' | 'table' | 'map'
type SortKey = '施設名' | '都道府県' | '最寄駅徒歩'

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort() as T[]
}

export default function PracticeListPage() {
  const [view, setView] = useState<ViewMode>('list')
  const [query, setQuery] = useState('')
  const [filterPref, setFilterPref] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStation, setFilterStation] = useState('')
  const [filterWalk, setFilterWalk] = useState('')
  const [filterPiano, setFilterPiano] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('施設名')
  const [sortAsc, setSortAsc] = useState(true)

  const prefs = useMemo(() => unique(practices.map(p => p.都道府県)), [])
  const cities = useMemo(
    () => unique(practices.filter(p => !filterPref || p.都道府県 === filterPref).map(p => p.市区町村)),
    [filterPref]
  )
  const categories = useMemo(() => unique(practices.map(p => p.分類).filter(Boolean) as string[]), [])
  const stations = useMemo(() => unique(practices.map(p => p.最寄駅).filter(Boolean) as string[]), [])

  const filtered = useMemo(() => {
    let list = practices.filter(p => {
      if (filterPref && p.都道府県 !== filterPref) return false
      if (filterCity && p.市区町村 !== filterCity) return false
      if (filterCategory && p.分類 !== filterCategory) return false
      if (filterStation && p.最寄駅 !== filterStation) return false
      if (filterWalk && (p.最寄駅徒歩 == null || p.最寄駅徒歩 > Number(filterWalk))) return false
      if (filterPiano && p.ピアノ有無 !== '〇') return false
      if (query) {
        const q = query.toLowerCase()
        const text = `${p.施設名}${p.都道府県}${p.市区町村}${p.番地以下}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })

    list.sort((a, b) => {
      let av: any, bv: any
      if (sortKey === '施設名') { av = a.施設名; bv = b.施設名 }
      else if (sortKey === '都道府県') { av = a.都道府県; bv = b.都道府県 }
      else { av = a.最寄駅徒歩 ?? 999; bv = b.最寄駅徒歩 ?? 999 }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })
    return list
  }, [query, filterPref, filterCity, filterCategory, filterStation, filterWalk, filterPiano, sortKey, sortAsc])

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
      <h1 className="text-2xl font-serif font-bold text-navy-700 mb-6 pb-2 border-b-2 border-gold-500">練習場一覧</h1>

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
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
            <option value="">分類（すべて）</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterStation} onChange={e => setFilterStation(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
            <option value="">最寄駅（すべて）</option>
            {stations.map(s => <option key={s}>{s}</option>)}
          </select>
          <div className="flex items-center gap-2 text-sm">
            <label>徒歩</label>
            <input type="number" min={0} value={filterWalk} onChange={e => setFilterWalk(e.target.value)} className="border rounded w-16 px-2 py-1.5" placeholder="〜" />
            <span>分以内</span>
          </div>
          <label className="flex items-center gap-1 cursor-pointer text-sm">
            <input type="checkbox" checked={filterPiano} onChange={e => setFilterPiano(e.target.checked)} />
            ピアノあり
          </label>
        </div>
      </details>

      {/* 表示切替 */}
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

      {view === 'list' && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="text-gray-500">並び替え:</span>
          {(['施設名', '都道府県', '最寄駅徒歩'] as SortKey[]).map(k => (
            <button key={k} onClick={() => toggleSort(k)}
              className={`px-2 py-0.5 rounded-full border text-xs transition-colors ${sortKey === k ? 'bg-navy-700 text-white border-navy-700' : 'border-gray-300 hover:border-navy-700 hover:text-navy-700'}`}>
              {k}{sortKey === k ? (sortAsc ? ' ▲' : ' ▼') : ''}
            </button>
          ))}
        </div>
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
                <SortTh k="施設名" label="施設名" />
                <SortTh k="都道府県" label="都道府県" />
                <th className="px-3 py-2 text-left whitespace-nowrap">市区町村</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">分類</th>
                <SortTh k="最寄駅徒歩" label="徒歩(分)" />
                <th className="px-3 py-2 text-left">ピアノ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.ID} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link to={`/practice/${p.ID}`} className="text-blue-600 hover:underline">{p.施設名}</Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.都道府県}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.市区町村}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.分類 ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{p.最寄駅徒歩 ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{p.ピアノ有無 ?? '—'}</td>
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
      <p className="font-serif font-semibold text-navy-700 group-hover:text-gold-600 transition-colors">{p.施設名}</p>
      <p className="text-sm text-gray-500 mt-1">{p.都道府県} {p.市区町村}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {p.分類 && <span className="bg-navy-50 text-navy-700 rounded-full px-2 py-0.5">{p.分類}</span>}
        {p.最寄駅 && <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{p.最寄駅}{p.最寄駅徒歩 != null ? ` 徒歩${p.最寄駅徒歩}分` : ''}</span>}
        {p.ピアノ有無 === '〇' && <span className="bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">ピアノ</span>}
      </div>
    </Link>
  )
}
