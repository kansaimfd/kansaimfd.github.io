interface Props {
  label: string
  title: string
  /** 単位。入力欄の右に添える 例: 席 */
  unit: string
  value: [string, string]
  onChange: (v: [string, string]) => void
}

/** 「◯席 〜 ◯席」の範囲指定。空欄はその側の制限なしを意味する */
export default function RangeInput({ label, title, unit, value, onChange }: Props) {
  return (
    <div className="range">
      <div className="filter-row__label">{label}</div>
      <div className="filter-row__title">{title}</div>
      <div className="range__inputs">
        <input
          type="number"
          min={0}
          value={value[0]}
          onChange={e => onChange([e.target.value, value[1]])}
          placeholder="—"
          aria-label={`${title}の下限`}
          className="range__input"
        />
        <span>{unit}</span>
        <span className="range__sep">〜</span>
        <input
          type="number"
          min={0}
          value={value[1]}
          onChange={e => onChange([value[0], e.target.value])}
          placeholder="—"
          aria-label={`${title}の上限`}
          className="range__input"
        />
        <span>{unit}</span>
      </div>
    </div>
  )
}
