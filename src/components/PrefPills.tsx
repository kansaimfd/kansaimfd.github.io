import FilterRow from './FilterRow'
import Pill from './Pill'

interface Props {
  /** 施設のある府県だけ（→ options.ts の prefOptions） */
  choices: string[]
  selected: string[]
  onToggle: (pref: string) => void
}

/**
 * 府県の絞り込み。**2つの一覧で同じものを使う。**
 *
 * 押したときに市区町村・最寄駅を落とすかどうかは一覧側の話ではないので、
 * `onToggle` に委ねる（府県 → 市区町村 → 駅の順に狭める規則は呼び出し側にある）。
 */
export default function PrefPills({ choices, selected, onToggle }: Props) {
  return (
    <FilterRow label="PREFECTURE" title="都道府県">
      {choices.map(pref => (
        <Pill
          key={pref}
          pref={pref}
          label={pref}
          on={selected.includes(pref)}
          onClick={() => onToggle(pref)}
        />
      ))}
    </FilterRow>
  )
}
