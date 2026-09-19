/**
 * 表の中の数値。一覧のカードの数値（Stat）と同じ明朝の太字で出す。
 *
 * 欠けたときの扱いも Stat に揃え、**1つでも欠けていれば全体を「—」にする**
 * （幅だけ分かっている舞台寸法は寸法として使えないため）。単位は列の見出しが持つ。
 */
export default function TableNum({ values }: { values: (number | null | undefined)[] }) {
  if (values.length === 0 || values.some(v => v == null)) {
    return <span className="table-num table-num--empty">—</span>
  }
  return (
    <span className="table-num">
      {values.map((v, i) => (
        <span key={i}>
          {i > 0 && <span className="table-num__sep">×</span>}
          {v}
        </span>
      ))}
    </span>
  )
}
