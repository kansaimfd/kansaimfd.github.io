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

/** 並び替えの選択肢1つ。`SortSelect` が並べる */
export interface SortOption<T extends string> {
  key: T
  asc: boolean
  label: string
}

/**
 * 並び替えの選択肢の文言。**2つの一覧で同じ表を使う。**
 *
 * 以前は一覧ごとに選択肢の配列を手で並べていて、同じ「最寄駅徒歩」が
 * 片方だけ言い回しを変えられる状態だった（実際に両方へ足すのを忘れれば、
 * 型チェックも lint も通ったまま選べる並びが食い違う）。
 *
 * **昇順・降順の両方を必ず載せる**（表の見出しを押すとどちらにもなるため）。
 * 並べる順は「まず選びたい向き」から。客席数は多い順、徒歩は近い順を先に置く。
 */
const SORT_LABELS = {
  施設名: [
    [true, '施設名（昇順）'],
    [false, '施設名（降順）'],
  ],
  都道府県: [
    [true, '都道府県（昇順）'],
    [false, '都道府県（降順）'],
  ],
  客席数: [
    [false, '客席数（多い順）'],
    [true, '客席数（少ない順）'],
  ],
  最寄駅徒歩: [
    [true, '最寄駅徒歩（近い順）'],
    [false, '最寄駅徒歩（遠い順）'],
  ],
} as const satisfies Record<string, readonly (readonly [boolean, string])[]>

/** 一覧が並び替えに使えるキー。一覧ごとの `*SortKey` はこの部分集合になる */
export type SortKey = keyof typeof SORT_LABELS

/** 一覧が持つキーの並びから、選択肢を作る */
export function sortOptions<T extends SortKey>(keys: readonly T[]): SortOption<T>[] {
  return keys.flatMap(key => SORT_LABELS[key].map(([asc, label]) => ({ key, asc, label })))
}
