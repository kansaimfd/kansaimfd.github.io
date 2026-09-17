interface Props<T extends string> {
  keys: T[]
  sortKey: T
  sortAsc: boolean
  onToggle: (key: T) => void
}

export default function SortBar<T extends string>({ keys, sortKey, sortAsc, onToggle }: Props<T>) {
  return (
    <div className="flex items-center gap-2 mb-3 text-sm">
      <span className="text-gray-500">並び替え:</span>
      {keys.map(k => (
        <button
          key={k}
          onClick={() => onToggle(k)}
          className={`px-2 py-0.5 rounded-full border text-xs transition-colors ${
            sortKey === k
              ? 'bg-navy-700 text-white border-navy-700'
              : 'border-gray-300 hover:border-navy-700 hover:text-navy-700'
          }`}
        >
          {k}
          {sortKey === k ? (sortAsc ? ' ▲' : ' ▼') : ''}
        </button>
      ))}
    </div>
  )
}
