interface Props<T extends string> {
  k: T
  label: string
  sortKey: T
  sortAsc: boolean
  onToggle: (key: T) => void
}

export default function SortableTh<T extends string>({ k, label, sortKey, sortAsc, onToggle }: Props<T>) {
  return (
    <th
      className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 whitespace-nowrap"
      onClick={() => onToggle(k)}
    >
      {label}{sortKey === k ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  )
}
