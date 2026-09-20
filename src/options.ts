import type { Availability, Station } from './types'
import { ALL_PREFS } from './pref'
import { stationName } from './station'

/**
 * 一覧の絞り込みで「選べるもの」を作る。**2つの一覧で同じものを使う。**
 *
 * 以前は各ページが別々に作っていて、練習場だけがデータのある府県・設備に
 * 絞り込んでいた（コンサートホール一覧には、押すと必ず0件になる府県のピルが並んでいた）。
 * 選択肢の作り方はページの描画と関係が無いので、ここへ出して両方から使う。
 *
 * **選択肢は「絞り込める幅」を示すものでもある。** 選んだ府県の外にある市区町村・駅を
 * 並べたままにすると、必ず0件になる組み合わせを利用者に選ばせることになる。
 * 逆に、いま選ばれている値は範囲の外でも必ず残す（URLは手で書き換えられるので、
 * 絞り込みには効いているのに選択欄では未選択に見える、という食い違いを作らない）。
 */

/** select の選択肢1つ。`value` は絞り込みに使う生の文字列で、`label` は表示だけ */
export interface SelectOption {
  value: string
  label: string
}

/** 府県ごとに束ねた選択肢（`<optgroup>` になる） */
export interface SelectGroup {
  label: string
  options: SelectOption[]
}

type AreaItem = {
  都道府県: string
  市区町村: string
  最寄駅?: Station[]
}

interface Entry {
  pref: string
  value: string
  label: string
}

/**
 * 府県ごとに束ねて並べる。
 *
 * **素の `.sort()` では五十音順にならない。** 施設名には読み（施設名かな）があるので
 * `compareByName` で五十音に並べられるが、市区町村・駅名には読みが無い。
 * コードポイント順のまま140件を並べると「三田市 / 京都市下京区 / … / 伊丹市 / 八尾市」の
 * ように目で追えないので、まず府県で束ねて探す範囲を狭める。
 * 束の中は従来どおりコードポイント順で、政令市の区は同じ接頭辞でまとまる。
 *
 * 同じ値が複数の府県に現れることがある（同名の駅）。**最初の府県の束にだけ置く**
 * ——同じ値の選択肢が2つ並んでも、選んだときの絞り込みは変わらないため。
 */
function groupByPref(entries: Entry[]): SelectGroup[] {
  const seen = new Set<string>()
  const byPref = new Map<string, SelectOption[]>()
  for (const e of entries) {
    if (seen.has(e.value)) continue
    seen.add(e.value)
    const group = byPref.get(e.pref)
    if (group) group.push({ value: e.value, label: e.label })
    else byPref.set(e.pref, [{ value: e.value, label: e.label }])
  }
  // 府県の並びは一覧のピルと揃える。表に無い府県（データ側の誤りや将来の追加）は後ろへ
  const prefs = [
    ...ALL_PREFS.filter(p => byPref.has(p)),
    ...[...byPref.keys()].filter(p => !ALL_PREFS.includes(p)),
  ]
  return prefs.map(pref => ({
    label: pref,
    // 値は上で重複を落としてあるので、等値の枝は通らない
    options: byPref.get(pref)!.sort((a, b) => (a.value < b.value ? -1 : 1)),
  }))
}

/**
 * データに無い値が選ばれている場合の置き場所。
 *
 * URLは手で書き換えられるし、共有されたリンクの駅が後からデータより消えることもある。
 * 絞り込みには効いている（`concerthall.ts` は市区町村・最寄駅を素通しする）ので、
 * **選択欄だけ未選択に見えると「0件だがなぜか分からない」画面になる。**
 * 府県が分からない値なので、府県の束には混ぜずに先頭へ置く。
 */
const SELECTED_GROUP = '選択中'

/** 選ばれている値が1つも無ければ、それだけの束を先頭に足す */
function ensureSelected(groups: SelectGroup[], selected: string): SelectGroup[] {
  if (!selected || groups.some(g => g.options.some(o => o.value === selected))) return groups
  return [{ label: SELECTED_GROUP, options: [{ value: selected, label: selected }] }, ...groups]
}

/** 施設が、選ばれている府県の中にあるか。府県を選んでいなければ全部が中 */
const inPrefs = (item: AreaItem, prefs: string[]) =>
  prefs.length === 0 || prefs.includes(item.都道府県)

/**
 * 市区町村の選択肢。選んだ府県の中だけに絞る
 * （府県を選ばずに全部並べると数百件になる）。
 */
export function cityOptions(items: AreaItem[], prefs: string[], selected: string): SelectGroup[] {
  const groups = groupByPref(
    items
      .filter(i => inPrefs(i, prefs) || i.市区町村 === selected)
      .map(i => ({ pref: i.都道府県, value: i.市区町村, label: i.市区町村 })),
  )
  return ensureSelected(groups, selected)
}

/**
 * 最寄駅の選択肢。府県と市区町村で絞る。
 *
 * 表示名だけは「出戸バスターミナル（バス停）」のように差し替える。
 * 値は駅名そのもの（データと突き合わせるため）。
 */
export function stationOptions(
  items: AreaItem[],
  prefs: string[],
  city: string,
  selected: string,
): SelectGroup[] {
  const entries: Entry[] = []
  for (const item of items) {
    const inScope = inPrefs(item, prefs) && (city === '' || item.市区町村 === city)
    for (const s of item.最寄駅 ?? []) {
      if (inScope || s.駅 === selected) {
        entries.push({ pref: item.都道府県, value: s.駅, label: stationName(s) })
      }
    }
  }
  return ensureSelected(groupByPref(entries), selected)
}

/** 施設のある府県だけ。押すと必ず0件になるピルを並べないため */
export function prefOptions(items: { 都道府県: string }[]): string[] {
  return ALL_PREFS.filter(p => items.some(i => i.都道府県 === p))
}

/** 記録が1件も無い設備は選択肢に出さない（同上） */
export function equipOptions<T, F extends { state: (item: T) => Availability | undefined }>(
  fields: readonly F[],
  items: T[],
): F[] {
  return fields.filter(f => items.some(i => f.state(i) !== undefined))
}
