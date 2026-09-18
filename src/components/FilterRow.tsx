import type { ReactNode } from 'react'

interface Props {
  /** 英字の小ラベル 例: PREFECTURE */
  label: string
  /** 日本語の項目名 例: 都道府県 */
  title: string
  children: ReactNode
}

/** 絞り込み条件の1行。左に項目名、右に選択肢を並べる */
export default function FilterRow({ label, title, children }: Props) {
  return (
    <div className="filter-row">
      <div className="filter-row__head">
        <div className="filter-row__label">{label}</div>
        <div className="filter-row__title">{title}</div>
      </div>
      <div className="filter-row__options">{children}</div>
    </div>
  )
}
