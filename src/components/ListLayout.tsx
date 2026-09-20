import { useMemo, type ReactNode } from 'react'
import { sortOptions, type SortKey } from '../sort'
import FilterPanel from './FilterPanel'
import SearchBox from './SearchBox'
import SortSelect from './SortSelect'
import UnknownNotice from './UnknownNotice'
import ViewToggle, { type ViewMode } from './ViewToggle'

interface Props<K extends SortKey> {
  /** 英字の小見出し 例: CONCERT HALLS */
  eyebrow: string
  title: string
  lead: string

  query: string
  onQuery: (v: string) => void

  /** 並べ替えに使えるキー。選択肢の文言は sort.ts が持つ */
  sortKeys: readonly K[]
  sortKey: K
  sortAsc: boolean
  onSort: (key: K, asc: boolean) => void

  /** 一覧ごとの絞り込み条件（FilterRow の並び） */
  filters: ReactNode
  /** 絞り込みが効いているときだけ渡す */
  onReset?: () => void

  view: ViewMode
  onChangeView: (v: ViewMode) => void
  count: number
  /** 件数の単位。既定は「件」 */
  unit?: string
  note?: string

  /** 未調査で判断できなかった件数と、その扱い（→ UnknownNotice） */
  unknown: {
    count: number
    fields: string[]
    included: boolean
    onToggle: () => void
  }

  /** 表示（リスト・表・地図）の中身 */
  children: ReactNode
}

/**
 * 一覧ページの骨格。**コンサートホールと練習場で同じものを使う。**
 *
 * 見出し・検索と並び替えの行・絞り込みパネル・件数と表示の切り替え・
 * 未調査の注意書きという並びは2つの一覧でまったく同じで、以前は同じ構造が
 * ページごとに書かれていた（カードを `FacilityCard` ひとつにしたのと同じ理由で、
 * 書き分けると片方だけ手を入れた結果2つの見た目に分かれる）。
 * 一覧ごとに違うのは、絞り込みの中身と表示の中身だけ。
 */
export default function ListLayout<K extends SortKey>({
  eyebrow,
  title,
  lead,
  query,
  onQuery,
  sortKeys,
  sortKey,
  sortAsc,
  onSort,
  filters,
  onReset,
  view,
  onChangeView,
  count,
  unit,
  note,
  unknown,
  children,
}: Props<K>) {
  const options = useMemo(() => sortOptions(sortKeys), [sortKeys])

  return (
    <div>
      <header className="page-head">
        {/* 府県の数は書かない。載っている府県はデータで変わる（→ src/options.ts の prefOptions） */}
        <p className="page-head__eyebrow">{eyebrow}</p>
        <h1 className="page-head__title">{title}</h1>
        <p className="page-head__lead">{lead}</p>
      </header>

      <FilterPanel
        onReset={onReset}
        head={
          <>
            {/* フリーワードは履歴を積まずに置き換える（→ ページ側の update の第2引数） */}
            <SearchBox value={query} onChange={onQuery} />
            <SortSelect options={options} sortKey={sortKey} sortAsc={sortAsc} onChange={onSort} />
          </>
        }
      >
        {filters}
      </FilterPanel>

      <ViewToggle view={view} onChangeView={onChangeView} count={count} unit={unit} note={note} />

      <UnknownNotice {...unknown} />

      {children}
    </div>
  )
}
