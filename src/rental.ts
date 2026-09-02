import type { Rental } from './types'

/** 休止期間の表記。開始も再開も分からなければ何も返さない */
function periodLabel(r: Rental): string | undefined {
  if (r.状態 === '終了') return r.開始
  if (r.開始 == null && r.再開 == null) return undefined
  return `${r.開始 ?? '時期不明'} 〜 ${r.再開 ?? '再開時期未定'}`
}

/**
 * 貸館の休止・終了を1行の文にする。通常どおり貸している施設では undefined。
 *
 * 借りられるかどうかは利用者にとって他のどの項目より重いので、
 * 一覧・詳細のどちらでも施設名のすぐそばに出す。
 */
export function rentalNotice(r: Rental | undefined): string | undefined {
  if (!r) return undefined
  const head = r.状態 === '休止' ? '貸館休止中' : '貸館終了'
  const detail = [periodLabel(r), r.理由].filter(Boolean).join('・')
  return detail ? `${head}（${detail}）` : head
}
