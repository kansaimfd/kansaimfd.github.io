import { useState, useMemo, useEffect } from 'react'
import { concerthalls } from '../data'
import type { ConcertHall, HallType } from '../types'
import { NO_WALK, lineLabel, minWalk, walkLabel } from '../station'
import { hasEquipment } from '../availability'
import { fullAddress, localAddress } from '../address'
import { compareByName } from '../name'
import FacilityMap from '../components/FacilityMap'
import { type ViewMode } from '../components/ViewToggle'
import SortableTh from '../components/SortableTh'
import RentalBadge from '../components/RentalBadge'
import UsageConditionBadge from '../components/UsageConditionBadge'

type SortKey = '施設名' | '都道府県' | '客席数' | '最寄駅徒歩'

function useSize() {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return { isMobile: w < 640, isTablet: w >= 640 && w < 1024 }
}
// Prefecture colour palette
const PREF_PALETTES: Record<string, { accent: string; tint: string; chip: string; label: string }> = {
  '大阪府':   { accent: '#1B2E4B', tint: '#eef2f7', chip: '#d5e0ed', label: 'OSAKA' },
  '京都府':   { accent: '#6b4a3a', tint: '#f3ece5', chip: '#d9c7b6', label: 'KYOTO' },
  '兵庫県':   { accent: '#2d5a4a', tint: '#e8f0ec', chip: '#c4d8cc', label: 'HYOGO' },
  '奈良県':   { accent: '#B8962E', tint: '#faf4df', chip: '#ecd896', label: 'NARA' },
  '滋賀県':   { accent: '#3a5a7a', tint: '#eaf0f5', chip: '#c8d6e0', label: 'SHIGA' },
  '和歌山県': { accent: '#8a3e3e', tint: '#f5e9e9', chip: '#d9b8b8', label: 'WAKAYAMA' },
}
const palOf = (pref: string) => PREF_PALETTES[pref] ?? PREF_PALETTES['大阪府']

/** 平坦化された一覧は同一施設の複数ホールを含むため、地図では施設ごと1マーカーにまとめる */
function dedupeByFacility(halls: ConcertHall[]): ConcertHall[] {
  const seen = new Map<number, ConcertHall>()
  for (const h of halls) if (!seen.has(h.ID)) seen.set(h.ID, h)
  return [...seen.values()]
}

// Music motif strip at top of card
function MusicMotif({ pref, isMobile }: { pref: string; isMobile: boolean }) {
  const p = palOf(pref)
  return (
    <div style={{
      position: 'relative', height: isMobile ? 40 : 48, overflow: 'hidden',
      background: `linear-gradient(180deg, ${p.tint} 0%, #fff 100%)`,
      borderBottom: `1px solid ${p.chip}`,
      display: 'flex', alignItems: 'center', padding: '0 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: p.accent }} />
        <span style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 13, fontWeight: 600, color: p.accent, letterSpacing: '0.04em' }}>{pref}</span>
        <span style={{ fontSize: 9, letterSpacing: 2, color: p.accent, opacity: 0.5, marginLeft: 2 }}>{p.label}</span>
      </div>
    </div>
  )
}

// Seat count
function SeatDial({ seats }: { seats: number }) {
  return (
    <div style={{ lineHeight: 1 }}>
      <div style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 19, fontWeight: 700, color: '#1B2E4B' }}>
        {seats}<span style={{ fontSize: 10, fontWeight: 400, color: '#6b7280', marginLeft: 2 }}>席</span>
      </div>
      <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, letterSpacing: 1 }}>CAPACITY</div>
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
function FilterRow({ label, title, children, isMobile }: { label: string; title: string; children: React.ReactNode; isMobile: boolean }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '120px 1fr',
      gap: isMobile ? 8 : 16,
      alignItems: isMobile ? 'stretch' : 'center',
      paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #f5f0e4',
    }}>
      <div style={{ lineHeight: 1.2 }}>
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

function StageCell({ w, d }: { w?: number | null; d?: number | null }) {
  if (w == null || d == null) return <div style={{ fontSize: 11, color: '#9ca3af' }}>—</div>
  return (
    <div style={{ lineHeight: 1 }}>
      <div style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 19, fontWeight: 700, color: '#1B2E4B' }}>
        {w}<span style={{ color: '#9ca3af', fontWeight: 400, margin: '0 2px' }}>×</span>{d}
        <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280', marginLeft: 2 }}>m</span>
      </div>
      <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4, letterSpacing: 1 }}>STAGE W×D</div>
    </div>
  )
}

function ConcertHallCard({ hall: h, isMobile, isTablet }: { hall: ConcertHall; isMobile: boolean; isTablet: boolean }) {
  const p = palOf(h.都道府県)
  const isDesktop = !isMobile && !isTablet
  const gridCols = isDesktop ? '2fr 1fr 1fr 1.2fr' : isTablet ? '1.6fr 1fr 1fr' : '1fr'
  const pad = isMobile ? '12px 14px 14px' : '14px 20px 16px'
  const gap = isMobile ? 10 : isTablet ? 16 : 24

  return (
    <article style={{ background: '#fff', border: '1px solid #e7e2d8', borderLeft: `3px solid ${p.accent}`, borderRadius: 8, overflow: 'hidden' }}>
      <MusicMotif pref={h.都道府県} isMobile={isMobile} />
      <div style={{ padding: pad, display: 'grid', gridTemplateColumns: gridCols, gap, alignItems: 'center' }}>
        {/* Name + address + access */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: '"Noto Serif JP", serif', fontWeight: 600, fontSize: isMobile ? 15 : 17, color: '#1B2E4B', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
              {h.施設名}
            </span>
            {h.部屋名 && <span style={{ fontSize: isMobile ? 11 : 12, color: '#9ca3af' }}>（{h.部屋名}）</span>}
            <RentalBadge 貸館={h.貸館} /><UsageConditionBadge 利用条件={h.利用条件} />
            {h.ホール種別 && (
              <span style={{
                fontSize: 10.5, padding: '2px 7px', borderRadius: 3,
                background: p.tint, color: p.accent, border: `1px solid ${p.chip}`,
              }}>{h.ホール種別}</span>
            )}
          </div>
          <p style={{ fontSize: isMobile ? 11 : 12, color: '#6b7280', margin: '4px 0 0', letterSpacing: '0.02em' }}>
            {localAddress(h)}
          </p>
          {h.最寄駅 && h.最寄駅.length > 0 && (
            <div style={{ marginTop: 3 }}>
              {h.最寄駅.map((s, i) => (
                <p key={i} style={{ fontSize: isMobile ? 10.5 : 11.5, color: '#6b7280', margin: '1px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {s.路線 && <span style={{ color: '#9ca3af' }}>{lineLabel(s)}</span>}
                  <span style={{ color: '#1B2E4B' }}>{s.駅}</span>
                  {s.出口 && <span style={{ color: '#9ca3af' }}>{s.出口}</span>}
                  {walkLabel(s) && <span style={{ color: '#9ca3af' }}>{walkLabel(s)}</span>}
                </p>
              ))}
            </div>
          )}
          {h.URL && (
            <a href={h.URL} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#B8962E', textDecoration: 'none', marginTop: 6, fontWeight: 500 }}>
              公式サイト
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M2 2h5v5M2 7L7 2" /></svg>
            </a>
          )}
        </div>

        {/* Mobile: seats + stage in one sub-row */}
        {isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 10, borderTop: '1px solid #f0ebde' }}>
            {h.客席数 != null ? <SeatDial seats={h.客席数} /> : <div style={{ fontSize: 11, color: '#9ca3af' }}>—</div>}
            <div style={{ textAlign: 'right' }}><StageCell w={h.舞台幅} d={h.舞台奥行} /></div>
          </div>
        )}

        {/* Desktop / Tablet: seat count */}
        {!isMobile && (h.客席数 != null ? <SeatDial seats={h.客席数} /> : <div style={{ fontSize: 11, color: '#9ca3af' }}>—</div>)}

        {/* Desktop / Tablet: stage dimensions */}
        {!isMobile && <StageCell w={h.舞台幅} d={h.舞台奥行} />}

        {/* Equipment badges */}
        <div style={{
          gridColumn: !isDesktop ? '1 / -1' : 'auto',
          display: 'flex', flexWrap: 'wrap', gap: 4,
          justifyContent: isDesktop ? 'flex-end' : 'flex-start',
          paddingTop: !isDesktop ? 10 : 0,
          borderTop: !isDesktop ? '1px solid #f0ebde' : 'none',
        }}>
          <EquipBadge label="ピアノ" on={h.ピアノ有無 === true} />
          <EquipBadge label="オルガン" on={h.パイプオルガン === true} />
          <EquipBadge label="譜面台" on={h.譜面台貸出 === true} />
          <EquipBadge label="親子室" on={h.親子室 === true} />
          {h.駐車場 != null && h.駐車場 > 0 && <EquipBadge label="駐車場" on />}
        </div>
      </div>
    </article>
  )
}

const ALL_PREFS = ['大阪府', '京都府', '兵庫県', '奈良県', '滋賀県', '和歌山県']
const ALL_HALL_TYPES: HallType[] = ['音楽専用', '多目的', '小ホール・サロン']
/** 3値（あり/なし/未調査）を持つ設備。駐車場は台数なのでここには含めない */
const EQUIP_FIELDS = [
  { key: 'piano',  label: 'ピアノあり',         pick: (h: ConcertHall) => h.ピアノ有無 },
  { key: 'organ',  label: 'パイプオルガンあり', pick: (h: ConcertHall) => h.パイプオルガン },
  { key: 'stand',  label: '譜面台貸出あり',     pick: (h: ConcertHall) => h.譜面台貸出 },
  { key: 'family', label: '親子室あり',         pick: (h: ConcertHall) => h.親子室 },
] as const

const EQUIP_OPTIONS = [
  ...EQUIP_FIELDS.map(({ key, label }) => ({ key, label })),
  { key: 'parking', label: '駐車場あり' },
]

export default function ConcertHallListPage() {
  const { isMobile, isTablet } = useSize()
  const [view] = useState<ViewMode>('list')
  const [query, setQuery] = useState('')
  const [filterPrefs, setFilterPrefs] = useState<string[]>([])
  const [filterEquip, setFilterEquip] = useState<Set<string>>(new Set())
  const [filterHallTypes, setFilterHallTypes] = useState<HallType[]>([])

  // データが1件も無い種別は選択肢に出さない。必ず0件になる絞り込みを見せないため
  const hallTypeOptions = useMemo(
    () => ALL_HALL_TYPES.filter(t => concerthalls.some(h => h.ホール種別 === t)),
    []
  )
  const [filterSeats, setFilterSeats] = useState<[string, string]>(['', ''])
  const [filterStageW, setFilterStageW] = useState<[string, string]>(['', ''])
  const [filterStageD, setFilterStageD] = useState<[string, string]>(['', ''])
  const [sortKey, setSortKey] = useState<SortKey>('施設名')
  const [sortAsc, setSortAsc] = useState(true)

  const { filtered, unknownExcluded } = useMemo(() => {
    // 設備以外の条件で先に絞る。設備は未調査による除外数を数えるため別段にする
    const base = concerthalls.filter(h => {
      if (filterPrefs.length > 0 && !filterPrefs.includes(h.都道府県)) return false
      if (filterHallTypes.length > 0 && (h.ホール種別 == null || !filterHallTypes.includes(h.ホール種別))) return false
      if (filterSeats[0] && (h.客席数 == null || h.客席数 < Number(filterSeats[0]))) return false
      if (filterSeats[1] && (h.客席数 == null || h.客席数 > Number(filterSeats[1]))) return false
      if (filterStageW[0] && (h.舞台幅 == null || h.舞台幅 < Number(filterStageW[0]))) return false
      if (filterStageW[1] && (h.舞台幅 == null || h.舞台幅 > Number(filterStageW[1]))) return false
      if (filterStageD[0] && (h.舞台奥行 == null || h.舞台奥行 < Number(filterStageD[0]))) return false
      if (filterStageD[1] && (h.舞台奥行 == null || h.舞台奥行 > Number(filterStageD[1]))) return false
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
    const excluded = activeEquip.length === 0 ? 0 : base.filter(h =>
      !list.includes(h) && activeEquip.some(e => e.pick(h) === undefined)
    ).length

    const sorted = [...list].sort((a, b) => {
      // 施設名は五十音順（コードポイント順だと 100BAN→7th Note→KOKO PLAZA→アイホール になる）
      if (sortKey === '施設名') return (sortAsc ? 1 : -1) * compareByName(a, b)
      let av: string | number, bv: string | number
      if (sortKey === '都道府県') { av = a.都道府県; bv = b.都道府県 }
      else if (sortKey === '客席数') { av = a.客席数 ?? -1; bv = b.客席数 ?? -1 }
      else { av = minWalk(a); bv = minWalk(b) }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })

    return { filtered: sorted, unknownExcluded: excluded }
  }, [query, filterPrefs, filterHallTypes, filterSeats, filterStageW, filterStageD, filterEquip, sortKey, sortAsc])

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
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const sortTh = (k: SortKey, label: string) => (
    <SortableTh k={k} label={label} sortKey={sortKey} sortAsc={sortAsc} onToggle={toggleSort} />
  )

  const sortSelect = (
    <span style={{ fontSize: 11.5, color: '#6b7280', whiteSpace: 'nowrap' }}>
      並び替え：
      <select
        value={`${sortKey}-${sortAsc ? 'asc' : 'desc'}`}
        onChange={e => {
          const [k, d] = e.target.value.split('-')
          setSortKey(k as SortKey)
          setSortAsc(d === 'asc')
        }}
        style={{ border: 'none', background: 'transparent', fontSize: 11.5, color: '#1B2E4B', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
      >
        <option value="施設名-asc">施設名（昇順）</option>
        <option value="施設名-desc">施設名（降順）</option>
        <option value="都道府県-asc">都道府県（昇順）</option>
        <option value="客席数-desc">客席数（多い順）</option>
        <option value="客席数-asc">客席数（少ない順）</option>
        <option value="最寄駅徒歩-asc">最寄駅徒歩（近い順）</option>
        <option value="最寄駅徒歩-desc">最寄駅徒歩（遠い順）</option>
      </select>
    </span>
  )

  return (
    <div>
      {/* Page title */}
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'flex-end',
        justifyContent: 'space-between',
        gap: isMobile ? 14 : 0,
        marginBottom: isMobile ? 20 : 28, paddingBottom: 14, borderBottom: '2px solid #B8962E',
      }}>
        <div>
          <div style={{ fontSize: 10, color: '#B8962E', letterSpacing: 3, fontWeight: 500, marginBottom: 6 }}>CONCERT HALLS</div>
          <h1 style={{ fontFamily: '"Noto Serif JP", serif', fontWeight: 700, fontSize: isMobile ? 22 : isTablet ? 26 : 30, color: '#1B2E4B', margin: 0, letterSpacing: '-0.01em' }}>
            コンサートホール一覧
          </h1>
          <p style={{ fontSize: isMobile ? 11.5 : 12, color: '#6b7280', margin: '6px 0 0' }}>
            関西6府県のホールを客席数・設備・アクセスで比較
          </p>
        </div>
      </div>

      {/* Filter panel */}
      <div style={{ background: '#fff', border: '1px solid #e7e2d8', borderRadius: 8, padding: isMobile ? '14px' : '18px 20px', marginBottom: 20 }}>
        {/* Search row */}
        <div style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : undefined,
          gridTemplateColumns: isMobile ? undefined : '1fr auto',
          gap: isMobile ? 8 : 12, alignItems: isMobile ? 'stretch' : 'center', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid #e7e2d8', borderRadius: 5, background: '#F8F6F0' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#9ca3af" strokeWidth="1.5"><circle cx="5.5" cy="5.5" r="3.5" /><path d="M8 8l3 3" strokeLinecap="round" /></svg>
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="フリーワード検索"
              style={{ border: 'none', background: 'transparent', fontSize: 12.5, outline: 'none', width: '100%', color: '#1a1a1a' }}
            />
          </div>
          {sortSelect}
        </div>

        <FilterRow label="PREFECTURE" title="都道府県" isMobile={isMobile}>
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

        {hallTypeOptions.length > 0 && (
          <FilterRow label="HALL TYPE" title="ホール種別" isMobile={isMobile}>
            {hallTypeOptions.map(t => {
              const on = filterHallTypes.includes(t)
              return (
                <button key={t} onClick={() => setFilterHallTypes(prev =>
                  prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
                )} style={{
                  padding: '5px 12px', fontSize: 11.5, fontFamily: 'inherit',
                  border: `1px solid ${on ? '#1B2E4B' : '#e7e2d8'}`,
                  background: on ? '#eef2f7' : '#fff',
                  color: on ? '#1B2E4B' : '#6b7280',
                  borderRadius: 999, cursor: 'pointer', fontWeight: on ? 500 : 400,
                }}>
                  {on ? '✓ ' : ''}{t}
                </button>
              )
            })}
          </FilterRow>
        )}

        <FilterRow label="EQUIPMENT" title="設備" isMobile={isMobile}>
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

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr',
          gap: isMobile ? 14 : 20,
          paddingTop: 14, marginTop: 2, borderTop: '1px solid #f0ebde',
        }}>
          <RangeInput label="CAPACITY" title="客席数" unit="席" value={filterSeats} onChange={setFilterSeats} />
          <RangeInput label="STAGE WIDTH" title="舞台幅" unit="m" value={filterStageW} onChange={setFilterStageW} />
          <RangeInput label="STAGE DEPTH" title="舞台奥行き" unit="m" value={filterStageD} onChange={setFilterStageD} />
        </div>
      </div>

      {unknownExcluded > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: '#faf4df', border: '1px solid #ecd896', borderRadius: 6,
          padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#8b6e1e', lineHeight: 1.6,
        }}>
          <span aria-hidden style={{ fontSize: 13 }}>⚠</span>
          <span>
            設備が<strong>未調査</strong>の {unknownExcluded} 件を絞り込みから除外しています。
            設備が「ない」と確認できたわけではないため、実際には条件に合う施設が含まれている可能性があります。
          </span>
        </div>
      )}

      {view === 'list' && (
        <div className="flex flex-col gap-3">
          {filtered.map(h => <ConcertHallCard key={h.キー} hall={h} isMobile={isMobile} isTablet={isTablet} />)}
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
                <tr key={h.キー} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <span className="text-navy-700">
                      {h.施設名}{h.部屋名 ? `（${h.部屋名}）` : ''}
                    </span>
                    <RentalBadge 貸館={h.貸館} /><UsageConditionBadge 利用条件={h.利用条件} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.都道府県}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.市区町村}</td>
                  <td className="px-3 py-2 text-right">{h.客席数 ?? '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.舞台幅 != null && h.舞台奥行 != null ? `${h.舞台幅}×${h.舞台奥行}` : '—'}</td>
                  <td className="px-3 py-2 text-right">{minWalk(h) < NO_WALK ? minWalk(h) : '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {h.ピアノ有無 === true && <span className="text-xs bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">ピアノ</span>}
                      {h.パイプオルガン === true && <span className="text-xs bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">オルガン</span>}
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

      {view === 'map' && <FacilityMap facilities={dedupeByFacility(filtered)} detailBasePath="/concert" />}

      {view === 'list' && (
        <div className="mt-12 pt-5 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400 tracking-widest">
          <span>KANSAI MFD · 2026</span>
          <span style={{ fontFamily: '"Noto Serif JP", serif', color: '#B8962E', fontSize: 14, letterSpacing: 8 }}>♪ ♫ ♪</span>
        </div>
      )}
    </div>
  )
}
