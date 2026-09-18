export interface SortOption<T extends string> {
  key: T
  asc: boolean
  label: string
}

interface Props<T extends string> {
  /** **昇順・降順の両方を必ず載せる。** 表の見出しクリックでどちらにもなるため */
  options: SortOption<T>[]
  sortKey: T
  sortAsc: boolean
  onChange: (key: T, asc: boolean) => void
}

/** 並び替えの選択。一覧・表のどちらの表示でも同じ状態を指す */
export default function SortSelect<T extends string>({
  options,
  sortKey,
  sortAsc,
  onChange,
}: Props<T>) {
  const current = options.findIndex(o => o.key === sortKey && o.asc === sortAsc)

  return (
    <label className="sort-select">
      並び替え：
      <select
        className="sort-select__control"
        value={current}
        onChange={e => {
          const o = options[Number(e.target.value)]
          onChange(o.key, o.asc)
        }}
      >
        {options.map((o, i) => (
          <option key={`${o.key}-${o.asc}`} value={i}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
