import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { practices } from '../data'
import type { Practice } from '../types'
import { NO_WALK, minWalk, stationNames, walkLabel } from '../station'
import { availabilityMark } from '../availability'
import { fullAddress } from '../address'
import FacilityMap from '../components/FacilityMap'
import ViewToggle, { type ViewMode } from '../components/ViewToggle'
import SortBar from '../components/SortBar'
import SortableTh from '../components/SortableTh'
import FilterPanel from '../components/FilterPanel'

type SortKey = '施設名' | '都道府県' | '最寄駅徒歩'

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort() as T[]
}

/**
 * 施設レベルと部屋レベルを合わせたピアノの3値。
 * どこかに true があれば true / すべて false なら false / 手がかりがなければ undefined（未調査）
 */
function pianoState(p: Practice): boolean | undefined {
  const values = [p.ピアノ有無, ...(p.部屋?.map(r => r.ピアノ有無) ?? [])]
  if (values.some(v => v === true)) return true
  if (values.some(v => v === false)) return false
  return undefined
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
  const stations = useMemo(() => unique(practices.flatMap(stationNames)), [])

  const { filtered, unknownExcluded } = useMemo(() => {
    // ピアノ以外の条件で先に絞る。ピアノは未調査による除外数を数えるため別段にする
    const base = practices.filter(p => {
      if (filterPref && p.都道府県 !== filterPref) return false
      if (filterCity && p.市区町村 !== filterCity) return false
      if (filterCategory && p.分類 !== filterCategory) return false
      if (filterStation && !stationNames(p).includes(filterStation)) return false
      if (filterWalk && minWalk(p) > Number(filterWalk)) return false
      if (query) {
        const q = query.toLowerCase()
        const text = `${p.施設名}${fullAddress(p)}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })

    const list = filterPiano ? base.filter(p => pianoState(p) === true) : base
    // 「ピアノなし」ではなく「未調査」のせいで消えた件数
    const excluded = filterPiano ? base.filter(p => pianoState(p) === undefined).length : 0

    const sorted = [...list].sort((a, b) => {
      let av: string | number, bv: string | number
      if (sortKey === '施設名') { av = a.施設名; bv = b.施設名 }
      else if (sortKey === '都道府県') { av = a.都道府県; bv = b.都道府県 }
      else { av = minWalk(a); bv = minWalk(b) }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })

    return { filtered: sorted, unknownExcluded: excluded }
  }, [query, filterPref, filterCity, filterCategory, filterStation, filterWalk, filterPiano, sortKey, sortAsc])

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
      </FilterPanel>

      <ViewToggle view={view} onChangeView={setView} count={filtered.length} />

      {unknownExcluded > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mb-4 text-xs text-amber-800 leading-relaxed">
          <span aria-hidden>⚠</span>
          <span>
            ピアノの有無が<strong>未調査</strong>の {unknownExcluded} 件を絞り込みから除外しています。
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
                <th className="px-3 py-2 text-left whitespace-nowrap">分類</th>
                {sortTh('最寄駅徒歩', '徒歩(分)')}
                <th className="px-3 py-2 text-left">ピアノ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.ID} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link to={`/practice/${p.ID}`} className="text-navy-700 hover:text-gold-500 hover:underline">{p.施設名}</Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.都道府県}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.市区町村}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.分類 ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{minWalk(p) < NO_WALK ? minWalk(p) : '—'}</td>
                  <td className="px-3 py-2 text-center">{availabilityMark(pianoState(p))}</td>
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
        {p.最寄駅?.slice(0, 1).map((s, i) => (
          <span key={i} className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{[s.駅, walkLabel(s)].filter(Boolean).join(' ')}</span>
        ))}
        {pianoState(p) === true && (
          <span className="bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">ピアノ</span>
        )}
      </div>
    </Link>
  )
}
