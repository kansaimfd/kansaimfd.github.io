import type { Rental } from '../types'
import { rentalNotice } from '../rental'

/**
 * 施設名や部屋名の横に出す小さな印。借りられないものを見分けられるようにする。
 * 期間や理由はバッジに収まらないので title に入れ、詳細ページの帯で全文を出す。
 */
export default function RentalBadge({ 貸館 }: { 貸館?: Rental }) {
  if (!貸館) return null
  return (
    <span
      title={rentalNotice(貸館)}
      className="ml-1.5 align-middle whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-300"
    >
      {貸館.状態 === '休止' ? '休止中' : '貸館終了'}
    </span>
  )
}
