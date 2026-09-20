/**
 * 一覧の並び替えで共通の比較。
 *
 * **未調査は向きに関わらず末尾へ送る。**
 *
 * 以前は未調査を番兵値（客席数は -1、徒歩分数は `NO_WALK` = 999）に均して
 * 普通に比較していた。そのため向きを変えると未調査が先頭を占める。
 * 「客席数（少ない順）」では調べていない18ホールが、「徒歩（遠い順）」では
 * 最寄駅の記録が無い13施設が、いずれも一覧の先頭に並んでいた。
 * **どちらの向きでも、値が分かっている施設を先に見せるのが並び替えの目的**なので、
 * 未調査は比較に入れず常に後ろへ置く。
 *
 * コンサートホールと練習場で同じ規則にするために切り出してある
 * （片方だけ直すと、同じ「徒歩の遠い順」が一覧ごとに違う並びになる）。
 */
export function compareUnknownLast(
  a: string | number | undefined,
  b: string | number | undefined,
  dir: number,
): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (a < b) return -dir
  if (a > b) return dir
  return 0
}
