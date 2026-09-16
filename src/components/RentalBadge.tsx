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
      className={
        'ml-1.5 align-middle whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium border ' +
        (予告
          ? 'bg-sky-50 text-sky-800 border-sky-300'
          : 'bg-amber-100 text-amber-900 border-amber-300')
      }
    >
      {rentalBadgeLabel(貸館)}
    </span>
  )
}
