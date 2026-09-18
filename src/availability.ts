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
 * 同じ3値を言葉にする。**読み上げに渡すのはこちら**。
 *
 * 記号だけでは「まる」「ばつ」としか読まれず、とくに未調査の「—」は
 * 無音かダッシュになって、「設備が無い」のか「調べていない」のかが伝わらない。
 * 3値を分けている意味が読み上げでは丸ごと消えてしまう。
 */
export function availabilityText(v: Availability | undefined): string {
  if (v === true) return 'あり'
  if (v === false) return 'なし'
  return '未調査'
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

/**
 * 有無の記号に添える詳細（「グランド・スタインウェイ」）。分からなければ undefined。
 *
 * 記号と詳細を繋いだ1本の文字列ではなく別々に返すのは、記号だけを aria-hidden にして
 * 読み上げには言葉を渡す必要があるため（AvailabilityMark）。
 */
export function pianoDetail(r: PianoFields): string | undefined {
  const detail = [r.ピアノ種別, r.ピアノメーカー].filter(Boolean).join('・')
  return detail || undefined
}

/** 「5本」。本数が分からなければ undefined */
export function standDetail(r: StandFields): string | undefined {
  return r.譜面台数 != null ? `${r.譜面台数}本` : undefined
}
