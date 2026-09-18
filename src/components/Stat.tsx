interface Props {
  /**
   * 表示する数値。舞台寸法のように2つ並べる場合は [幅, 奥行] を渡し、「×」で繋いで出す。
   * **1つでも欠けていれば全体を「—」にする**（幅だけ分かっていても寸法としては使えないため）。
   */
  values: (number | null | undefined)[]
  unit?: string
  /** 数値の下に出す英字の見出し 例: CAPACITY */
  caption: string
  /** 狭い画面で右寄せにする（2つの数値を左右に並べたときの右側） */
  align?: 'right'
}

/**
 * 客席数・舞台寸法・定員などの数値表示。
 *
 * 値が無いときに空欄ではなく「—」を出すのは、行が詰まって隣の施設の数値に
 * 見えるのを防ぐため。
 */
export default function Stat({ values, unit, caption, align }: Props) {
  const className = align === 'right' ? 'stat stat--right' : 'stat'

  if (values.length === 0 || values.some(v => v == null)) {
    return <div className={`${className} stat--empty`}>—</div>
  }

  return (
    <div className={className}>
      <div className="stat__value">
        {values.map((v, i) => (
          <span key={i}>
            {i > 0 && <span className="stat__sep">×</span>}
            {v}
          </span>
        ))}
        {unit && <span className="stat__unit">{unit}</span>}
      </div>
      <div className="stat__caption">{caption}</div>
    </div>
  )
}
