import type { ReactNode } from 'react'

interface Props {
  /** 絞り込みを終えた件数。0件の表示を出すかの判断に使う */
  count: number
  children: ReactNode
}

/** リスト表示の枠。カードの中身は一覧ごとに違うが、枠と0件の表示は共通 */
export default function CardList({ count, children }: Props) {
  return (
    <div className="facility-list">
      {children}
      {count === 0 && <p className="empty">該当する施設がありません</p>}
    </div>
  )
}
