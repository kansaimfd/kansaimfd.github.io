import type { Availability } from './types'

/**
 * 設備の3値（あり / なし / 未調査）を表示用の記号にする。
 * undefined は「なし」ではなく「未調査」なので、× とは必ず区別する。
 */
export function availabilityMark(v: Availability | undefined): string {
  if (v === true) return '〇'
  if (v === false) return '×'
  return '—'
}

/**
 * 「設備ありで絞り込む」条件。未調査（undefined）は false 扱いで除外される。
 * 除外された件数は countUnknown で数えて利用者に開示すること。
 */
export function hasEquipment(v: Availability | undefined): boolean {
  return v === true
}
