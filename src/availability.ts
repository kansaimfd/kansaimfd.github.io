import type { Availability } from './types'

/**
 * 値が無いときの2つの理由。**どちらも「なし」ではない。**
 * 施設のサイトは無いものをまず書かないので、調べても埋まらない空欄が多い。
 * 「未調査」とだけ出すと、調べていないように見えて実態と違う。
 */
export type Blank = '未調査' | '記載なし'

/** 部屋・施設の項目が空いている理由（出典[].記載なし から配られた `記載なし` を見る） */
export function blankOf(record: { 記載なし?: string[] }, field: string): Blank {
  return record.記載なし?.includes(field) ? '記載なし' : '未調査'
}

/**
 * 情報表（TEL・駐車場など）の値。値が無く公式にも記載が無かったなら、そう書く。
 * 未調査なら undefined（行ごと出さない。これまでどおり）
 */
export function valueOrNotStated<T>(
  value: T | undefined,
  record: { 記載なし?: string[] },
  field: string,
): T | string | undefined {
  if (value != null) return value
  return blankOf(record, field) === '記載なし' ? '公式に記載なし' : undefined
}

/**
 * 設備の3値（あり / なし / 未調査）を表示用の記号にする。
 * undefined は「なし」ではなく「未調査」なので、× とは必ず区別する。
 * 公式に記載が無かったものは記号ではなく言葉で出す（— のままでは未調査と見分けがつかない）。
 */
export function availabilityMark(v: Availability | undefined, blank: Blank = '未調査'): string {
  if (v === true) return '〇'
  if (v === false) return '×'
  return blank === '記載なし' ? '記載なし' : '—'
}

/**
 * 同じ3値を言葉にする。**読み上げに渡すのはこちら**。
 *
 * 記号だけでは「まる」「ばつ」としか読まれず、とくに未調査の「—」は
 * 無音かダッシュになって、「設備が無い」のか「調べていない」のかが伝わらない。
 * 3値を分けている意味が読み上げでは丸ごと消えてしまう。
 */
export function availabilityText(v: Availability | undefined, blank: Blank = '未調査'): string {
  if (v === true) return 'あり'
  if (v === false) return 'なし'
  return blank === '記載なし' ? '公式に記載なし' : '未調査'
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
