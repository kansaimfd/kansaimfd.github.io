import type { UsageCondition } from '../types'

/**
 * 「誰でも借りられるわけではない」施設の条件を出す帯。
 *
 * 貸館の休止・終了とは別の話（今も貸してはいる）なので、色も文言も分けている。
 * 借りられるかどうかは二値で表せないため、種別だけでなく公式の記載に沿った説明を必ず出す。
 */
export default function UsageConditionNote({ 利用条件 }: { 利用条件?: UsageCondition }) {
  if (!利用条件) return null
  return (
    <p className="mt-2 mb-4 px-3 py-2 rounded-lg border border-violet-300 bg-violet-50 text-violet-900 text-sm">
      <span className="font-medium">{利用条件.種別}</span>
      <span className="mx-1.5 text-violet-400">|</span>
      {利用条件.説明}
    </p>
  )
}
