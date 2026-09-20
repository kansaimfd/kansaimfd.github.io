/**
 * 築年月（開館年月）の見せ方。
 *
 * データは `1990-11` の `YYYY-MM` で持ち、**画面では「1990年11月」で出す**。
 * 形を揃えるのはデータ側の役目、読める形にするのは表示側の役目、と分けてある
 * （`YYYY-MM` は並べ替えと突き合わせができる形で、年だけを取り出すのもここでやる）。
 *
 * 形が違う値が来たら、書いてあるものをそのまま出す。**表示のために値を捨てない。**
 * 築年月は validate.mjs が形を見ていない項目なので、`1990` や `1990年11月` が
 * データに混ざる余地が残っている。
 */
const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/

/** `1990-11` → `1990年11月`。月の頭の0は落とす（`1990年04月` とは書かない） */
export function formatBuiltDate(value: string): string {
  const parsed = YEAR_MONTH.exec(value)
  return parsed ? `${parsed[1]}年${Number(parsed[2])}月` : value
}

/**
 * 見出しの OPENED に出す年。月が無くても年が4桁で読めれば出す
 * （`1990` だけの値でも年は分かる）。
 */
export function builtYear(value: string | undefined): number | undefined {
  const year = value?.match(/^\d{4}/)
  return year ? Number(year[0]) : undefined
}
