interface Props {
  label: string
  title: string
  /** 単位。入力欄の右に添える 例: 席 */
  unit: string
  value: [string, string]
  onChange: (v: [string, string]) => void
}

/**
 * 「◯席 〜 ◯席」の範囲指定。空欄はその側の制限なしを意味する。
 *
 * **`type="number"` は使わない。** 数値入力欄は「妥当な数」でない値を
 * `value` として返さない決まりで、`16.` は妥当な数ではない。
 * 一覧の状態はURLが持つので打鍵ごとに値が往復し、小数点を打った瞬間に
 * 空文字が返って**入力欄が勝手に空になる**（舞台幅は146ホール中60ホールが小数）。
 * `inputMode="decimal"` なら、打ちかけの `16.` はそのまま返りつつ
 * スマートフォンでは数字キーパッドが出る。値の検査は query.ts が行う。
 */
export default function RangeInput({ label, title, unit, value, onChange }: Props) {
  return (
    <div className="range">
      <div className="filter-row__label">{label}</div>
      <div className="filter-row__title">{title}</div>
      <div className="range__inputs">
        <input
          type="text"
          inputMode="decimal"
          value={value[0]}
          onChange={e => onChange([e.target.value, value[1]])}
          placeholder="—"
          aria-label={`${title}の下限`}
          className="range__input"
        />
        <span>{unit}</span>
        <span className="range__sep">〜</span>
        <input
          type="text"
          inputMode="decimal"
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
