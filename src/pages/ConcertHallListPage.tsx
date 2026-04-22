import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { concerthalls } from '../data'
import type { ConcertHall } from '../types'
import FacilityMap from '../components/FacilityMap'
import ViewToggle, { type ViewMode } from '../components/ViewToggle'
import SortBar from '../components/SortBar'
import SortableTh from '../components/SortableTh'

type SortKey = '施設名' | '都道府県' | '客席数' | '最寄駅徒歩'
type Motif = 'pipe' | 'staff' | 'arch' | 'note' | 'wave'

// Prefecture colour palette
const PREF_PALETTES: Record<string, { accent: string; tint: string; chip: string; label: string }> = {
  '大阪府':   { accent: '#1B2E4B', tint: '#eef2f7', chip: '#d5e0ed', label: 'OSAKA' },
  '京都府':   { accent: '#6b4a3a', tint: '#f3ece5', chip: '#d9c7b6', label: 'KYOTO' },
  '兵庫県':   { accent: '#2d5a4a', tint: '#e8f0ec', chip: '#c4d8cc', label: 'HYOGO' },
  '奈良県':   { accent: '#B8962E', tint: '#faf4df', chip: '#ecd896', label: 'NARA' },
  '滋賀県':   { accent: '#3a5a7a', tint: '#eaf0f5', chip: '#c8d6e0', label: 'SHIGA' },
  '和歌山県': { accent: '#8a3e3e', tint: '#f5e9e9', chip: '#d9b8b8', label: 'WAKAYAMA' },
}
const PREF_MOTIFS: Record<string, Motif> = {
  '大阪府': 'pipe', '京都府': 'arch', '兵庫県': 'wave',
  '奈良県': 'note', '滋賀県': 'staff', '和歌山県': 'arch',
}
const palOf = (pref: string) => PREF_PALETTES[pref] ?? PREF_PALETTES['大阪府']
const motifOf = (pref: string): Motif => PREF_MOTIFS[pref] ?? 'staff'

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort() as T[]
}

// Music motif strip at top of card (minimal decoration)
function MusicMotif({ pref }: { pref: string }) {
  const p = palOf(pref)
  const motif = motifOf(pref)
  return (
    <div style={{
      position: 'relative', height: 48, overflow: 'hidden',
      background: `linear-gradient(180deg, ${p.tint} 0%, #fff 100%)`,
      borderBottom: `1px solid ${p.chip}`,
      display: 'flex', alignItems: 'center', padding: '0 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: p.accent }} />
        <span style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 13, fontWeight: 600, color: p.accent, letterSpacing: '0.04em' }}>{pref}</span>
        <span style={{ fontSize: 9, letterSpacing: 2, color: p.accent, opacity: 0.5, marginLeft: 2 }}>{p.label}</span>
      </div>
      {/* Motif mark (right, minimal) */}
      <div style={{ marginLeft: 'auto' }}>
        {motif === 'pipe' && (
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            {[10, 16, 22, 28, 32, 28, 22, 16, 10].map((h, i) => (
              <div key={i} style={{ width: 2.5, height: h, background: p.accent, opacity: 0.4, borderRadius: '1px 1px 0 0' }} />
            ))}
          </div>
        )}
        {motif === 'staff' && (
          <div style={{ position: 'relative', width: 20, height: 40 }}>
            <div style={{ position: 'absolute', left: 9, top: 0, width: 2, height: 40, background: p.accent, opacity: 0.6 }} />
            <div style={{ position: 'absolute', left: 5, top: 0, width: 9, height: 9, background: p.accent, borderRadius: '50%', opacity: 0.6 }} />
            <div style={{ position: 'absolute', left: 5, top: 32, width: 9, height: 9, background: p.accent, borderRadius: '50%', opacity: 0.6 }} />
          </div>
        )}
        {motif === 'arch' && (
          <div style={{ width: 50, height: 25, borderRadius: '25px 25px 0 0', border: `1.5px solid ${p.accent}`, borderBottom: 'none', opacity: 0.5 }} />
        )}
        {motif === 'note' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ position: 'relative', width: 12, height: 38 }}>
                <div style={{ position: 'absolute', left: 0, bottom: 0, width: 10, height: 7, background: p.accent, borderRadius: '50%', transform: 'rotate(-18deg)', opacity: 0.6 }} />
                <div style={{ position: 'absolute', left: 8, bottom: 3, width: 2, height: 33, background: p.accent, opacity: 0.6 }} />
              </div>
            ))}
          </div>
        )}
        {motif === 'wave' && (
          <svg width="70" height="24" viewBox="0 0 70 24">
            <path d="M0 12 Q 8 2 16 12 T 32 12 T 48 12 T 64 12" stroke={p.accent} strokeWidth="1.2" fill="none" opacity="0.5" />
          </svg>
        )}
      </div>
    </div>
  )
}

// Seat count with circular ring
function SeatDial({ seats, pref }: { seats: number; pref: string }) {
  const p = palOf(pref)
  const pct = Math.min(seats / 2000, 1)
  const R = 13, C = 2 * Math.PI * R
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <svg width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r={R} fill="none" stroke={p.chip} strokeWidth="2.5" />
        <circle cx="16" cy="16" r={R} fill="none" stroke={p.accent} strokeWidth="2.5"
          strokeDasharray={`${pct * C} ${C}`} strokeLinecap="round"
          transform="rotate(-90 16 16)" />
      </svg>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 19, fontWeight: 700, color: '#1B2E4B' }}>
          {seats}<span style={{ fontSize: 10, fontWeight: 400, color: '#6b7280', marginLeft: 2 }}>席</span>
        </div>
        <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, letterSpacing: 1 }}>CAPACITY</div>
      </div>
    </div>
  )
}

// Equipment badge pill
function EquipBadge({ label, on }: { label: string; on?: boolean }) {
  if (!on) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, padding: '3px 8px', borderRadius: 999,
      background: '#faf4df', color: '#8b6e1e',
      border: '1px solid #ecd896', fontWeight: 500,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#B8962E' }} />
      {label}
    </span>
  )
}

// Filter label row
function FilterRow({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'center', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #f5f0e4' }}>
      <div>
        <div style={{ fontSize: 10, color: '#B8962E', letterSpacing: 2, fontWeight: 500 }}>{label}</div>
        <div style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 13, color: '#1B2E4B', marginTop: 2 }}>{title}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

// Range input pair
function RangeInput({ label, title, unit, value, onChange }: {
  label: string; title: string; unit: string
  value: [string, string]; onChange: (v: [string, string]) => void
}) {
  const inputStyle: React.CSSProperties = {
    width: 64, padding: '5px 8px', fontSize: 12,
    border: '1px solid #e7e2d8', borderRadius: 4, background: '#F8F6F0',
    color: '#1B2E4B', textAlign: 'right', outline: 'none', fontFamily: 'inherit',
  }
  return (
    <div>
      <div style={{ fontSize: 10, color: '#B8962E', letterSpacing: 2, fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 13, color: '#1B2E4B', marginTop: 2, marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
        <input type="number" min={0} value={value[0]} onChange={e => onChange([e.target.value, value[1]])} placeholder="—" style={inputStyle} />
        <span>{unit}</span>
        <span style={{ color: '#9ca3af' }}>〜</span>
        <input type="number" min={0} value={value[1]} onChange={e => onChange([value[0], e.target.value])} placeholder="—" style={inputStyle} />
        <span>{unit}</span>
      </div>
    </div>
  )
}

function ConcertHallCard({ hall: h }: { hall: ConcertHall }) {
  const p = palOf(h.都道府県)
  return (
    <article style={{
      background: '#fff',
      border: '1px solid #e7e2d8',
      borderLeft: `3px solid ${p.accent}`,
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <MusicMotif pref={h.都道府県} />
      <div style={{
        padding: '14px 20px 16px',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1.2fr',
        gap: 24,
        alignItems: 'center',
      }}>
        {/* Name + address + access */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <Link to={`/concert/${h.ID}`} style={{ fontFamily: '"Noto Serif JP", serif', fontWeight: 600, fontSize: 17, color: '#1B2E4B', letterSpacing: '-0.01em', textDecoration: 'none', lineHeight: 1.3 }}>
              {h.施設名}
            </Link>
            {h.部屋名 && <span style={{ fontSize: 12, color: '#9ca3af' }}>（{h.部屋名}）</span>}
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0', letterSpacing: '0.02em' }}>
            {h.市区町村}{h.番地以下}
          </p>
          {(h.最寄駅路線 || h.最寄駅) && (
            <p style={{ fontSize: 11.5, color: '#6b7280', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {h.最寄駅路線 && <span style={{ color: '#9ca3af' }}>{h.最寄駅路線}</span>}
              {h.最寄駅 && <span style={{ color: '#1B2E4B' }}>{h.最寄駅}</span>}
              {h.最寄駅徒歩 != null && <span style={{ color: '#9ca3af' }}>徒歩{h.最寄駅徒歩}分</span>}
            </p>
          )}
          {h.URL && (
            <a href={h.URL} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#B8962E', textDecoration: 'none', marginTop: 6, fontWeight: 500 }}>
              公式サイト
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M2 2h5v5M2 7L7 2" /></svg>
            </a>
          )}
        </div>

        {/* Seat count */}
        {h.客席数 != null
          ? <SeatDial seats={h.客席数} pref={h.都道府県} />
          : <div style={{ fontSize: 11, color: '#9ca3af' }}>—</div>
        }

        {/* Stage dimensions */}
        <div style={{ lineHeight: 1 }}>
          {h.舞台幅 != null && h.舞台奥行 != null ? (
            <>
              <div style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 19, fontWeight: 700, color: '#1B2E4B' }}>
                {h.舞台幅}<span style={{ color: '#9ca3af', fontWeight: 400, margin: '0 2px' }}>×</span>{h.舞台奥行}
                <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280', marginLeft: 2 }}>m</span>
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4, letterSpacing: 1 }}>STAGE W×D</div>
            </>
          ) : <div style={{ fontSize: 11, color: '#9ca3af' }}>—</div>}
        </div>

        {/* Equipment badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
          <EquipBadge label="ピアノ" on={h.ピアノ有無 === '〇'} />
          <EquipBadge label="オルガン" on={h.パイプオルガン === '〇'} />
          <EquipBadge label="譜面台" on={h.譜面台貸出 === '〇'} />
          <EquipBadge label="親子室" on={h.親子室 === '〇'} />
          {h.駐車場 != null && h.駐車場 > 0 && <EquipBadge label="駐車場" on />}
        </div>
      </div>
    </article>
  )
}

const ALL_PREFS = ['大阪府', '京都府', '兵庫県', '奈良県', '滋賀県', '和歌山県']
const EQUIP_OPTIONS = [
  { key: 'piano',   label: 'ピアノあり' },
  { key: 'organ',   label: 'パイプオルガンあり' },
  { key: 'stand',   label: '譜面台貸出あり' },
  { key: 'family',  label: '親子室あり' },
  { key: 'parking', label: '駐車場あり' },
] as const

export default function ConcertHallListPage() {
  const [view, setView] = useState<ViewMode>('list')
  const [query, setQuery] = useState('')
  const [filterPrefs, setFilterPrefs] = useState<string[]>([])
  const [filterEquip, setFilterEquip] = useState<Set<string>>(new Set())
  const [filterLine, setFilterLine] = useState('')
  const [filterSeats, setFilterSeats] = useState<[string, string]>(['', ''])
  const [filterStageW, setFilterStageW] = useState<[string, string]>(['', ''])
  const [filterStageD, setFilterStageD] = useState<[string, string]>(['', ''])
  const [sortKey, setSortKey] = useState<SortKey>('施設名')
  const [sortAsc, setSortAsc] = useState(true)

  const lines = useMemo(() => unique(concerthalls.map(h => h.最寄駅路線).filter(Boolean) as string[]), [])

  const filtered = useMemo(() => {
    const list = concerthalls.filter(h => {
      if (filterPrefs.length > 0 && !filterPrefs.includes(h.都道府県)) return false
      if (filterLine && h.最寄駅路線 !== filterLine) return false
      if (filterSeats[0] && (h.客席数 == null || h.客席数 < Number(filterSeats[0]))) return false
      if (filterSeats[1] && (h.客席数 == null || h.客席数 > Number(filterSeats[1]))) return false
      if (filterStageW[0] && (h.舞台幅 == null || h.舞台幅 < Number(filterStageW[0]))) return false
      if (filterStageW[1] && (h.舞台幅 == null || h.舞台幅 > Number(filterStageW[1]))) return false
      if (filterStageD[0] && (h.舞台奥行 == null || h.舞台奥行 < Number(filterStageD[0]))) return false
      if (filterStageD[1] && (h.舞台奥行 == null || h.舞台奥行 > Number(filterStageD[1]))) return false
      if (filterEquip.has('piano') && h.ピアノ有無 !== '〇') return false
      if (filterEquip.has('organ') && h.パイプオルガン !== '〇') return false
      if (filterEquip.has('stand') && h.譜面台貸出 !== '〇') return false
      if (filterEquip.has('family') && h.親子室 !== '〇') return false
      if (filterEquip.has('parking') && !(h.駐車場 != null && h.駐車場 > 0)) return false
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
  }, [query, filterPrefs, filterLine, filterSeats, filterStageW, filterStageD, filterEquip, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  function togglePref(pref: string) {
    setFilterPrefs(prev => prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref])
  }

  function toggleEquip(key: string) {
    setFilterEquip(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const sortTh = (k: SortKey, label: string) => (
    <SortableTh k={k} label={label} sortKey={sortKey} sortAsc={sortAsc} onToggle={toggleSort} />
  )

  return (
    <div>
      {/* Page title */}
      <div className="flex items-end justify-between mb-7 pb-3 border-b-2 border-gold-500 flex-wrap gap-3">
        <div>
          <div style={{ fontSize: 10, color: '#B8962E', letterSpacing: 3, fontWeight: 500, marginBottom: 6 }}>CONCERT HALLS</div>
          <h1 className="text-3xl font-serif font-bold text-navy-700 m-0 leading-tight">コンサートホール一覧</h1>
          <p className="text-xs text-gray-500 mt-1.5">関西6府県のホールを客席数・設備・アクセスで比較</p>
        </div>
        <ViewToggle view={view} onChangeView={setView} count={filtered.length} />
      </div>

      {/* Filter panel */}
      <div style={{ background: '#fff', border: '1px solid #e7e2d8', borderRadius: 8, padding: '18px 20px', marginBottom: 20 }}>
        {/* Search row */}
        <div className="flex items-center gap-3 mb-4">
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid #e7e2d8', borderRadius: 5, background: '#F8F6F0' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#9ca3af" strokeWidth="1.5"><circle cx="5.5" cy="5.5" r="3.5" /><path d="M8 8l3 3" strokeLinecap="round" /></svg>
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="フリーワード検索"
              style={{ border: 'none', background: 'transparent', fontSize: 12.5, outline: 'none', width: '100%', color: '#1a1a1a' }}
            />
          </div>
          <select value={filterLine} onChange={e => setFilterLine(e.target.value)} className="border rounded px-2 py-1.5 text-sm" style={{ borderColor: '#e7e2d8', background: '#F8F6F0' }}>
            <option value="">路線（すべて）</option>
            {lines.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>

        <FilterRow label="PREFECTURE" title="都道府県">
          {ALL_PREFS.map(pref => {
            const on = filterPrefs.includes(pref)
            const p = palOf(pref)
            return (
              <button key={pref} onClick={() => togglePref(pref)} style={{
                padding: '5px 12px', fontSize: 11.5, fontFamily: 'inherit',
                border: `1px solid ${on ? p.accent : '#e7e2d8'}`,
                background: on ? p.tint : '#fff',
                color: on ? p.accent : '#6b7280',
                borderRadius: 999, cursor: 'pointer', fontWeight: on ? 500 : 400,
              }}>
                {on ? '✓ ' : ''}{pref}
              </button>
            )
          })}
        </FilterRow>

        <FilterRow label="EQUIPMENT" title="設備">
          {EQUIP_OPTIONS.map(({ key, label }) => {
            const on = filterEquip.has(key)
            return (
              <button key={key} onClick={() => toggleEquip(key)} style={{
                padding: '5px 12px', fontSize: 11.5, fontFamily: 'inherit',
                border: `1px solid ${on ? '#B8962E' : '#e7e2d8'}`,
                background: on ? '#faf4df' : '#fff',
                color: on ? '#8b6e1e' : '#6b7280',
                borderRadius: 999, cursor: 'pointer', fontWeight: on ? 500 : 400,
              }}>
                {on ? '✓ ' : ''}{label}
              </button>
            )
          })}
        </FilterRow>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, paddingTop: 14, marginTop: 2, borderTop: '1px solid #f0ebde' }}>
          <RangeInput label="CAPACITY" title="客席数" unit="席" value={filterSeats} onChange={setFilterSeats} />
          <RangeInput label="STAGE WIDTH" title="舞台幅" unit="m" value={filterStageW} onChange={setFilterStageW} />
          <RangeInput label="STAGE DEPTH" title="舞台奥行き" unit="m" value={filterStageD} onChange={setFilterStageD} />
        </div>
      </div>

      {view === 'list' && (
        <SortBar
          keys={['施設名', '都道府県', '客席数', '最寄駅徒歩'] as SortKey[]}
          sortKey={sortKey} sortAsc={sortAsc} onToggle={toggleSort}
        />
      )}

      {view === 'list' && (
        <div className="flex flex-col gap-3">
          {filtered.map(h => <ConcertHallCard key={h.ID} hall={h} />)}
          {filtered.length === 0 && <p className="text-gray-400 py-8 text-center">該当する施設がありません</p>}
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
                <th className="px-3 py-2 text-left whitespace-nowrap">舞台(W×D)</th>
                {sortTh('最寄駅徒歩', '徒歩(分)')}
                <th className="px-3 py-2 text-left">設備</th>
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
                  <td className="px-3 py-2 whitespace-nowrap">{h.舞台幅 != null && h.舞台奥行 != null ? `${h.舞台幅}×${h.舞台奥行}` : '—'}</td>
                  <td className="px-3 py-2 text-right">{h.最寄駅徒歩 ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {h.ピアノ有無 === '〇' && <span className="text-xs bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">ピアノ</span>}
                      {h.パイプオルガン === '〇' && <span className="text-xs bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">オルガン</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-4 text-gray-400 text-center">該当する施設がありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'map' && <FacilityMap facilities={filtered} detailBasePath="/concert" />}

      {view === 'list' && (
        <div className="mt-12 pt-5 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400 tracking-widest">
          <span>KANSAI MFD · 2026</span>
          <span style={{ fontFamily: '"Noto Serif JP", serif', color: '#B8962E', fontSize: 14, letterSpacing: 8 }}>♪ ♫ ♪</span>
        </div>
      )}
    </div>
  )
}
