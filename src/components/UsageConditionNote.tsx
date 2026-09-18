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
    <p className="notice notice--usage">
      <span>
        <strong>{利用条件.種別}</strong>
        <span className="notice__sep">|</span>
        {利用条件.説明}
      </span>
    </p>
  )
}
