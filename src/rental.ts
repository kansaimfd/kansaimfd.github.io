import type { Rental } from './types'

/**
 * 状態ごとの見出し。
 *
 * **予定 だけは「今は借りられる」**ことに注意する。ホールの予約は12か月前から取るので、
 * 休館が先でも今日の利用者には必要な情報になる。休止・終了と同じ見せ方をすると、
 * 今借りられる施設を借りられないものとして見せてしまう。
 */
const HEAD: Record<Rental['状態'], string> = {
  休止: '貸館休止中',
  終了: '貸館終了',
  予定: '休館予定',
  廃止: '閉館・解体済み',
}

/** 再開しないことが定義の状態。期間は始まりだけを出す */
const FINAL: Rental['状態'][] = ['終了', '廃止']

/** 休止期間の表記。開始も再開も分からなければ何も返さない */
function periodLabel(r: Rental): string | undefined {
  if (FINAL.includes(r.状態)) return r.開始
  if (r.開始 == null && r.再開 == null) return undefined
  const 再開未定 = r.状態 === '予定' ? '終了時期未定' : '再開時期未定'
  return `${r.開始 ?? '時期不明'} 〜 ${r.再開 ?? 再開未定}`
}

/**
 * 貸館の休止・終了を1行の文にする。通常どおり貸している施設では undefined。
 *
 * 借りられるかどうかは利用者にとって他のどの項目より重いので、
 * 一覧・詳細のどちらでも施設名のすぐそばに出す。
 */
export function rentalNotice(r: Rental | undefined): string | undefined {
  if (!r) return undefined
  const detail = [periodLabel(r), r.理由].filter(Boolean).join('・')
  return detail ? `${HEAD[r.状態]}（${detail}）` : HEAD[r.状態]
}

/** バッジに出す短い語。期間や理由は入らないので rentalNotice を title に添える */
export function rentalBadgeLabel(r: Rental): string {
  return r.状態 === '休止' ? '休止中' : r.状態 === '終了' ? '貸館終了' : HEAD[r.状態]
}

/**
 * もう借りられないことが確定しているもの（終了・廃止）。**一覧では既定で隠す。**
 * 休止は再開が予定されているので隠さない（予約の再開を待っている人がいる）。
 */
export function isClosed(r: Rental | undefined): boolean {
  return r != null && FINAL.includes(r.状態)
}

/**
 * 一覧の絞り込み条件。貸館を終えた施設は、利用者が表示を選んだときだけ出す。
 * 値は必ず判断できるので、未調査にはならない。
 */
export function matchRentable(r: Rental | undefined, showClosed: boolean): 'pass' | 'fail' {
  return showClosed || !isClosed(r) ? 'pass' : 'fail'
}

/** 予定は「まだ借りられる」ので、借りられないものとは色を分ける */
export function isStillRentable(r: Rental | undefined): boolean {
  return r == null || r.状態 === '予定'
}
