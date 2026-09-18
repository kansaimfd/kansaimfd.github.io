interface Props {
  /** 未選択のときに出す文言 例: 市区町村（すべて） */
  placeholder: string
  value: string
  options: string[]
  onChange: (v: string) => void
  /** 読み上げ用の項目名 */
  label: string
}

/** 選択肢が多くてピルに収まらない条件（市区町村・最寄駅）で使う */
export default function FilterSelect({ placeholder, value, options, onChange, label }: Props) {
  return (
    <select
      className="filter-select"
      aria-label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
