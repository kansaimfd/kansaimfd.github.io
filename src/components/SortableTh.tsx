interface Props<T extends string> {
  k: T
  label: string
  sortKey: T
  sortAsc: boolean
  onToggle: (key: T) => void
}

/** 押すと並び替えが切り替わる表の見出し */
export default function SortableTh<T extends string>({
  k,
  label,
  sortKey,
  sortAsc,
  onToggle,
}: Props<T>) {
  const on = sortKey === k
  return (
    <th
      className="data-table__sortable"
      aria-sort={on ? (sortAsc ? 'ascending' : 'descending') : 'none'}
      onClick={() => onToggle(k)}
    >
      {label}
      {on ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  )
}
