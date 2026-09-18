interface Props {
  label: string
  title: string
  /** 入力欄の右に続く語 例: 名以上 / 分以内 */
  suffix: string
  value: string
  onChange: (v: string) => void
}

/**
 * 片側だけの数値条件（「50名以上」「徒歩10分以内」）。
 * 見た目は RangeInput と揃えてあるので、同じ行に並べても段差が出ない。
 */
export default function BoundInput({ label, title, suffix, value, onChange }: Props) {
  return (
    <div className="range">
      <div className="filter-row__label">{label}</div>
      <div className="filter-row__title">{title}</div>
      <div className="range__inputs">
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="—"
          aria-label={`${title}（${suffix}）`}
          className="range__input"
        />
        <span>{suffix}</span>
      </div>
    </div>
  )
}
