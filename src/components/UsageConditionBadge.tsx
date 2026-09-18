import type { UsageCondition } from '../types'

/** 一覧で「誰でも借りられるわけではない」ことに気づけるようにする小さな印 */
export default function UsageConditionBadge({ 利用条件 }: { 利用条件?: UsageCondition }) {
  if (!利用条件) return null
  return (
    <span title={利用条件.説明} className="badge badge--usage">
      {利用条件.種別}
    </span>
  )
}
