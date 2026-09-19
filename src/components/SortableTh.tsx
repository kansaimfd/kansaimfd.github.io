interface Props<T extends string> {
  k: T
  label: string
  sortKey: T
  sortAsc: boolean
  onToggle: (key: T) => void
  /** 数値の列。見出しもセルと同じく右に寄せる */
  numeric?: boolean
}

/**
 * 押すと並び替えが切り替わる表の見出し。
 *
 * **中身を button にしてあるのは、th 自体にはキーボードで辿り着けないため。**
 * onClick を th に置くと、見出しから並び替えられるのはマウス利用者だけになる。
 * 昇順・降順は th の aria-sort が伝えるので、▲▼ の記号は読み上げから隠す。
 */
export default function SortableTh<T extends string>({
  k,
  label,
  sortKey,
  sortAsc,
  onToggle,
  numeric,
}: Props<T>) {
  const on = sortKey === k
  return (
    <th
      scope="col"
      className={numeric ? 'is-num' : undefined}
      aria-sort={on ? (sortAsc ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" className="data-table__sortable" onClick={() => onToggle(k)}>
        {label}
        {on && <span aria-hidden>{sortAsc ? ' ▲' : ' ▼'}</span>}
      </button>
    </th>
  )
}
