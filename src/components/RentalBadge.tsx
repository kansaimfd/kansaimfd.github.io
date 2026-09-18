import type { Rental } from '../types'
import { rentalNotice, rentalBadgeLabel, isStillRentable } from '../rental'

/**
 * 施設名や部屋名の横に出す小さな印。借りられないものを見分けられるようにする。
 * 期間や理由はバッジに収まらないので title に入れ、詳細ページの帯で全文を出す。
 *
 * **予定（休館の告知はあるが今は借りられる）は色を分ける。**
 * 休止・終了と同じ見た目にすると、今借りられる施設を借りられないものとして見せてしまう。
 */
export default function RentalBadge({ 貸館 }: { 貸館?: Rental }) {
  if (!貸館) return null
  const 予告 = isStillRentable(貸館)
  return (
    <span
      title={rentalNotice(貸館)}
      className={`badge ${予告 ? 'badge--planned' : 'badge--rental'}`}
    >
      {rentalBadgeLabel(貸館)}
    </span>
  )
}
