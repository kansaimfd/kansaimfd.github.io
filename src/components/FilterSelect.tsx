interface Props {
  /** 未選択のときに出す文言 例: 市区町村（すべて） */
  placeholder: string
  value: string
  options: string[]
  onChange: (v: string) => void
  /** 読み上げ用の項目名 */
  label: string
  /**
   * 表示名の差し替え。**値は絞り込みに使う生の文字列のまま**にしておきたいが、
   * 表示だけは変えたい場合に使う（バス停に「（バス停）」を添えるなど）
   */
  formatOption?: (v: string) => string
}

/** 選択肢が多くてピルに収まらない条件（市区町村・最寄駅）で使う */
export default function FilterSelect({
  placeholder,
  value,
  options,
  onChange,
  label,
  formatOption,
}: Props) {
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
          {formatOption ? formatOption(o) : o}
        </option>
      ))}
    </select>
  )
}
