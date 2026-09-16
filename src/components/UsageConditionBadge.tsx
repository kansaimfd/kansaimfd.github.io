import type { UsageCondition } from '../types'

/** 一覧で「誰でも借りられるわけではない」ことに気づけるようにする小さな印 */
export default function UsageConditionBadge({ 利用条件 }: { 利用条件?: UsageCondition }) {
  if (!利用条件) return null
  return (
    <span
      title={利用条件.説明}
      className="ml-1.5 align-middle whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium bg-violet-50 text-violet-800 border border-violet-300"
    >
      {利用条件.種別}
    </span>
  )
}
