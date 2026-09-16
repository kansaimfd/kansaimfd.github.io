import type { Rental } from '../types'
import { rentalNotice, isStillRentable } from '../rental'

/**
 * 詳細ページの先頭に出す帯。借りられない理由と期間を全文で出す。
 *
 * **予定（休館の告知はあるが今は借りられる）は色を分ける。**
 * 休止・終了と同じ赤系にすると、今日から借りられる施設を閉まっているものとして見せてしまう。
 */
export default function RentalNotice({ 貸館 }: { 貸館?: Rental }) {
  const text = rentalNotice(貸館)
  if (!text) return null
  const 予告 = isStillRentable(貸館)
  return (
    <p
      className={
        'mt-2 mb-4 px-3 py-2 rounded-lg border text-sm font-medium ' +
        (予告
          ? 'bg-sky-50 border-sky-300 text-sky-900'
          : 'bg-amber-50 border-amber-300 text-amber-900')
      }
    >
      {予告 && <span className="mr-1">今は借りられます。</span>}
      {text}
    </p>
  )
}
