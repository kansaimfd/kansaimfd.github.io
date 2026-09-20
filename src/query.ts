import type { ViewMode } from './components/ViewToggle'

/**
 * 絞り込みの状態とURLクエリの相互変換。
 *
 * 一覧の状態を `useState` に持っていたころは、**絞り込んだ結果を人に送れず、
 * ブラウザの戻るで一覧そのものを離れ、地図から詳細へ行って戻ると条件が消えていた。**
 * 状態の置き場所をURLにすると、この3つが同時に解ける。
 *
 * ここは URLSearchParams と値の変換だけを持ち、React には触れない
 * （ページを描画せずに往復を確かめられるようにするため）。
 *
 * **URLは人が手で書き換えられる**ので、読む側は必ず知っている値だけを通す。
 * 知らない府県名や設備キーをそのまま絞り込みに渡すと、0件の理由が分からない画面になる。
 */

/** 数値の範囲。空文字は「指定なし」 */
export type Range = [string, string]

/** 複数選択の区切り。府県名・設備キー・ホール種別のどれにも現れない文字 */
const SEP = ','

/** 範囲の区切り。値は0以上なので負号と紛れない */
const RANGE_SEP = '-'

const VIEWS: ViewMode[] = ['list', 'table', 'map']

/**
 * 0以上の数値だけを通す。負数・文字を混ぜたものは「指定なし」に倒す。
 *
 * **小数を通すこと。** 整数だけにしていたころ、舞台幅に `16.5` と打つと
 * `.` を打った時点で URL に載らず、入力欄が勝手に空になっていた
 * （一覧の状態はURLが持つので、打鍵ごとにここを通って戻ってくる）。
 * 舞台寸法は146ホール中60ホールが小数で、いずみホールは 19.4×10.5m ある。
 *
 * 打ちかけの `16.` も通す（次の桁を打てなくなるため）。`Number('16.')` は 16 で、
 * 絞り込みの比較はそのまま働く。小数点だけの `.` は `Number` が NaN を返すので、
 * 「指定はあるが比較できない」状態にならないよう弾く。
 */
const asNumberText = (v: string): string =>
  v !== '' && /^\d*\.?\d*$/.test(v) && Number.isFinite(Number(v)) ? v : ''

export function readText(params: URLSearchParams, key: string): string {
  return params.get(key) ?? ''
}

/** 選択肢のうち、知っている値だけを元の並び順で返す（重複は落とす） */
export function readList<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T[] {
  const given = new Set((params.get(key) ?? '').split(SEP))
  return allowed.filter(v => given.has(v))
}

export function readSet(
  params: URLSearchParams,
  key: string,
  allowed: readonly string[],
): Set<string> {
  return new Set(readList(params, key, allowed))
}

/** "500-1200" / "-1200" / "500-" を [下限, 上限] にする */
export function readRange(params: URLSearchParams, key: string): Range {
  const raw = params.get(key)
  if (raw == null) return ['', '']
  const [min = '', max = ''] = raw.split(RANGE_SEP)
  return [asNumberText(min), asNumberText(max)]
}

/** 定員・徒歩のような片側だけの数値条件 */
export function readNumber(params: URLSearchParams, key: string): string {
  return asNumberText(params.get(key) ?? '')
}

/** オン・オフの条件。`1` のときだけオン（既定はオフなのでURLに載せない） */
export function readFlag(params: URLSearchParams, key: string): boolean {
  return params.get(key) === '1'
}

export function writeFlag(params: URLSearchParams, key: string, on: boolean): void {
  if (on) params.set(key, '1')
}

export function readView(params: URLSearchParams): ViewMode {
  const v = params.get('view')
  return VIEWS.find(x => x === v) ?? 'list'
}

/** "客席数.desc" を読む。知らないキーや向きは既定に倒す */
export function readSort<T extends string>(
  params: URLSearchParams,
  allowed: readonly T[],
  fallback: T,
): { key: T; asc: boolean } {
  const [rawKey, dir] = (params.get('sort') ?? '').split('.')
  const key = allowed.find(k => k === rawKey)
  if (!key) return { key: fallback, asc: true }
  return { key, asc: dir !== 'desc' }
}

/**
 * 以下は書き出し側。**既定値のときは何も書かない。**
 * 何も絞り込んでいない `/concert` に `?view=list&sort=施設名.asc` が付いて回ると、
 * 共有したときに「何か条件が付いている」ように見えてしまう。
 */

export function writeText(params: URLSearchParams, key: string, value: string): void {
  if (value) params.set(key, value)
}

export function writeList(params: URLSearchParams, key: string, values: readonly string[]): void {
  if (values.length > 0) params.set(key, values.join(SEP))
}

/** 集合は並びが不定なので、選択肢の並び順に揃えてから書く（同じ条件なら同じURLになる） */
export function writeSet(
  params: URLSearchParams,
  key: string,
  values: ReadonlySet<string>,
  allowed: readonly string[],
): void {
  writeList(
    params,
    key,
    allowed.filter(v => values.has(v)),
  )
}

export function writeRange(params: URLSearchParams, key: string, [min, max]: Range): void {
  if (min || max) params.set(key, `${min}${RANGE_SEP}${max}`)
}

export function writeView(params: URLSearchParams, view: ViewMode): void {
  if (view !== 'list') params.set('view', view)
}

export function writeSort<T extends string>(
  params: URLSearchParams,
  key: T,
  asc: boolean,
  fallback: T,
): void {
  if (key === fallback && asc) return
  params.set('sort', `${key}.${asc ? 'asc' : 'desc'}`)
}
