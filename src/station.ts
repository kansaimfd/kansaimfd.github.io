import type { Station, StationKind } from './types'

/** 徒歩分数が不明な施設のソート・フィルタ用の番兵値 */
export const NO_WALK = 999

type HasStations = { 最寄駅?: Station[] }

export function stationNames(f: HasStations): string[] {
  return f.最寄駅?.map(s => s.駅) ?? []
}

/** 最寄駅のうち最短の徒歩分数。分からない場合は NO_WALK */
export function minWalk(f: HasStations): number {
  return Math.min(NO_WALK, ...(f.最寄駅?.map(s => s.駅徒歩 ?? NO_WALK) ?? []))
}

/**
 * 絞り込み・並び替え用の徒歩分数。**1駅も分数が分からなければ undefined を返す。**
 * 番兵値の `NO_WALK` に均すと「999分の施設」と区別がつかず、
 * 未調査のまま静かに除外されたり、並び替えで先頭に来たりする。
 */
export function knownWalk(f: HasStations): number | undefined {
  const walk = minWalk(f)
  return walk === NO_WALK ? undefined : walk
}

/** 名前そのものが「◯◯バス停」と言っているか。言っているなら種別を添える必要はない */
const namedAsBusStop = (名前: string) => /(バス停|停留所)$/.test(名前)

/**
 * 鉄道の駅かバス停か。`種別` があればそれに従い、無ければ名前から判別する。
 * 名前で分かるものにまで `種別` を書かせると、YAML側の書き漏れが増えるだけなので補完する。
 */
export function stationKind(s: Station): StationKind {
  return s.種別 ?? (namedAsBusStop(s.駅) ? 'バス停' : '駅')
}

/**
 * 表示用の駅名。バス停には「（バス停）」を添える。
 * 「しづかホール前」「出戸バスターミナル」は名前だけでは鉄道駅と区別がつかず、
 * 電車で行けると誤解される。名前が既にバス停と言っている場合は重ねない。
 */
export function stationName(s: Station): string {
  return stationKind(s) === 'バス停' && !namedAsBusStop(s.駅) ? `${s.駅}（バス停）` : s.駅
}

/** 路線名。複数路線が同一駅に乗り入れる場合は「・」で連ねる（公式サイトの慣習に合わせる） */
export function lineLabel(s: Station): string {
  return s.路線?.join('・') ?? ''
}

/** 「徒歩5分」/ 推定値なら「徒歩約10分」。徒歩分数が不明なら undefined */
export function walkLabel(s: Station): string | undefined {
  if (s.駅徒歩 == null) return undefined
  return `徒歩${s.駅徒歩推定 ? '約' : ''}${s.駅徒歩}分`
}

/** 「JR京都線 新大阪駅 東口 徒歩7分」形式の1行表記 */
export function stationLabel(s: Station): string {
  return [lineLabel(s), stationName(s), s.出口, walkLabel(s)].filter(Boolean).join(' ')
}
