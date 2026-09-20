import type { ReactNode } from 'react'
import EmptyResult from './EmptyResult'

interface Props {
  /** 絞り込みを終えた件数。0件の表示を出すかの判断に使う */
  count: number
  onReset?: () => void
  children: ReactNode
}

/** リスト表示の枠。カードの中身は一覧ごとに違うが、枠と0件の表示は共通 */
export default function CardList({ count, onReset, children }: Props) {
  return (
    <div className="facility-list">
      {children}
      {count === 0 && <EmptyResult onReset={onReset} />}
    </div>
  )
}
