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

type PianoFields = { ピアノ有無?: Availability; ピアノ種別?: string; ピアノメーカー?: string }
type StandFields = { 譜面台貸出?: Availability; 譜面台数?: number }

/** 「〇 グランド（スタインウェイ）」のように、有無に分かっている詳細を添える */
export function pianoLabel(r: PianoFields): string {
  const mark = availabilityMark(r.ピアノ有無)
  const detail = [r.ピアノ種別, r.ピアノメーカー].filter(Boolean).join('・')
  return detail ? `${mark} ${detail}` : mark
}

/** 「〇 5本」。本数が分からなければ記号のみ */
export function standLabel(r: StandFields): string {
  const mark = availabilityMark(r.譜面台貸出)
  return r.譜面台数 != null ? `${mark} ${r.譜面台数}本` : mark
}
