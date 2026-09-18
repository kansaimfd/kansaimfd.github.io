import type { Rental } from '../types'
import { rentalNotice, isStillRentable } from '../rental'

/**
 * 詳細ページの先頭に出す帯。借りられない理由と期間を全文で出す。
 *
 * **予定（休館の告知はあるが今は借りられる）は色を分ける。**
 * 休止・終了と同じ色にすると、今日から借りられる施設を閉まっているものとして見せてしまう。
 */
export default function RentalNotice({ 貸館 }: { 貸館?: Rental }) {
  const text = rentalNotice(貸館)
  if (!text) return null
  const 予告 = isStillRentable(貸館)
  return (
    <p className={`notice ${予告 ? 'notice--planned' : 'notice--rental'}`}>
      <span>
        {予告 && '今は借りられます。'}
        {text}
      </span>
    </p>
  )
}
