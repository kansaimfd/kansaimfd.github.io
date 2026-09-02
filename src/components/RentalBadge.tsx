import type { Rental } from '../types'

/** 一覧で施設名の横に出す小さな印。借りられない施設を見分けられるようにする */
export default function RentalBadge({ 貸館 }: { 貸館?: Rental }) {
  if (!貸館) return null
  return (
    <span className="ml-1.5 align-middle whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-300">
      {貸館.状態 === '休止' ? '休止中' : '貸館終了'}
    </span>
  )
}
