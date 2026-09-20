import FilterRow from './FilterRow'
import Pill from './Pill'

interface Props {
  /** 記録が1件も無い設備は落としたもの（→ options.ts の equipOptions） */
  choices: readonly { key: string; label: string }[]
  selected: ReadonlySet<string>
  onToggle: (key: string) => void
}

/**
 * 設備の絞り込み。**2つの一覧で同じものを使う**（項目そのものは一覧ごとに違う）。
 * 選べる設備が1つも無ければ行ごと出さない。
 */
export default function EquipPills({ choices, selected, onToggle }: Props) {
  if (choices.length === 0) return null
  return (
    <FilterRow label="EQUIPMENT" title="設備">
      {choices.map(({ key, label }) => (
        <Pill key={key} equip label={label} on={selected.has(key)} onClick={() => onToggle(key)} />
      ))}
    </FilterRow>
  )
}
