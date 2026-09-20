import type { Availability } from './types'
import type { Range } from './query'
import { toHiragana } from './name'

/**
 * 絞り込みの条件を、**「合う / 合わない / 判断できない」の3つ**で扱うための共通部品。
 *
 * 設備の3値（あり／なし／未調査）はもともとこの形で扱っていたが、
 * 客席数・舞台寸法・ホール種別・定員・徒歩分数といった**数値と選択の条件では、
 * 未調査がただ静かに除外されていた**。一覧に出るホールの1割ほどは客席数が
 * 入っていないので、客席数で絞った瞬間にそれが何の断りもなく消える
 * （ホール種別は3分の1、舞台寸法は7割が未調査）。
 * 「設備が未調査の◯件を除外しています」の注意書きは設備を選んだときしか出ないため、
 * 利用者からは0件や少なすぎる結果の理由が分からない。
 *
 * **未調査は「無い」ではない**という方針（CLAUDE.md「設備の3値」）は、
 * 項目の型が boolean かどうかとは関係がない。そこで条件を一様にこの形へ揃え、
 * 未調査で判断できなかった件数と、その原因になった項目名をまとめて返す。
 *
 * **含めるか外すかは利用者が選ぶ**（`includeUnknown`）。既定は外す側——条件に
 * 合うと確かめられた施設が先に見える方が探す目的には合う——だが、数だけ知らせても
 * 利用者にできることが「条件を外す」しかないので、含める道も用意する。
 */
export type Match = 'pass' | 'fail' | 'unknown'

/** 条件1つ分。`label` は未調査で除外したときに利用者へ示す名前 */
export interface Condition<T> {
  label: string
  match: (item: T) => Match
}

export interface FilterResult<T> {
  filtered: T[]
  /**
   * 値が「合わない」のではなく「未調査」だったために、合うとも合わないとも
   * 言えなかった件数。**`includeUnknown` で含めた場合も数える**
   * （含めていることを注意書きで伝えるため）。黙って消すと、実際には
   * 条件に合う施設を見落とさせる
   */
  unknownCount: number
  /** 判断できなさを実際に起こした項目名（注意書きに出す） */
  unknownFields: string[]
}

/**
 * 全条件を通す。**1つでも「合わない」があれば、未調査があっても数えない**
 * （客席数が未調査でも、府県が違えばそれは未調査のせいで外れたのではない）。
 *
 * `includeUnknown` を立てると、判断できなかったものも一覧に含める。件数と項目名は
 * どちらの場合も同じように返す（画面はそれを見て文言を変える）。
 */
export function applyConditions<T>(
  items: T[],
  conditions: Condition<T>[],
  includeUnknown = false,
): FilterResult<T> {
  const filtered: T[] = []
  const unknownBy = new Set<string>()
  let unknownCount = 0

  for (const item of items) {
    let failed = false
    const unknowns: string[] = []
    for (const c of conditions) {
      const m = c.match(item)
      if (m === 'fail') {
        failed = true
        break
      }
      if (m === 'unknown') unknowns.push(c.label)
    }
    if (failed) continue
    if (unknowns.length === 0) {
      filtered.push(item)
      continue
    }
    if (includeUnknown) filtered.push(item)
    unknownCount++
    for (const label of unknowns) unknownBy.add(label)
  }

  // 条件の並び順に揃える（同じ絞り込みなら毎回同じ文言になるように）
  const unknownFields = conditions.map(c => c.label).filter(label => unknownBy.has(label))
  return { filtered, unknownCount, unknownFields }
}

/**
 * 検索語と検索対象を突き合わせる前に均す。
 *
 * **打ち方の違いだけで0件になるのを避ける。** 全角・半角（ＲＨＹ / RHY）と
 * 大文字・小文字を NFKC で、カタカナとひらがなを `toHiragana` で揃える。
 * 施設名かなはひらがなで書く決まりなので、「ホール」と打った人が
 * 「ほーる」に当たらないと、かなを検索対象に入れた意味が無い。
 */
const normalize = (s: string): string => toHiragana(s.normalize('NFKC').toLowerCase())

/** 自由入力の文字列一致。空なら指定なし。値は必ずあるので未調査にならない */
export function matchText(text: string, query: string): Match {
  if (!query) return 'pass'
  return normalize(text).includes(normalize(query)) ? 'pass' : 'fail'
}

/** 選択肢のどれかに当たるか。選択が空なら指定なし。値が未調査なら判断できない */
export function matchOneOf<T>(value: T | undefined | null, selected: readonly T[]): Match {
  if (selected.length === 0) return 'pass'
  if (value == null) return 'unknown'
  return selected.includes(value) ? 'pass' : 'fail'
}

/** 複数の値のどれかが選択に当たるか（最寄駅のように1施設が複数持つもの） */
export function matchAny<T>(values: readonly T[], selected: readonly T[]): Match {
  if (selected.length === 0) return 'pass'
  if (values.length === 0) return 'unknown'
  return values.some(v => selected.includes(v)) ? 'pass' : 'fail'
}

/** 数値の範囲。上下とも空なら指定なし。値が未調査なら判断できない */
export function matchRange(value: number | undefined | null, [min, max]: Range): Match {
  if (!min && !max) return 'pass'
  if (value == null) return 'unknown'
  if (min && value < Number(min)) return 'fail'
  if (max && value > Number(max)) return 'fail'
  return 'pass'
}

/** 「◯以上」。`min` が空なら指定なし */
export function matchAtLeast(value: number | undefined | null, min: string): Match {
  return matchRange(value, [min, ''])
}

/** 「◯以内」。`max` が空なら指定なし */
export function matchAtMost(value: number | undefined | null, max: string): Match {
  return matchRange(value, ['', max])
}

/** 設備の3値。あり＝合う / なし＝合わない / 未調査＝判断できない */
export function matchAvailability(v: Availability | undefined): Match {
  if (v === true) return 'pass'
  if (v === false) return 'fail'
  return 'unknown'
}
