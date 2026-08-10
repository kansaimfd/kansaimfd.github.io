import type { Station } from './types'

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
  return [lineLabel(s), s.駅, s.出口, walkLabel(s)].filter(Boolean).join(' ')
}
