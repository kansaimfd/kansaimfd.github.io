import type { SelectGroup } from '../options'

interface Props {
  /** 未選択のときに出す文言 例: 市区町村（すべて） */
  placeholder: string
  value: string
  /** 府県ごとに束ねた選択肢（→ options.ts） */
  groups: SelectGroup[]
  onChange: (v: string) => void
  /** 読み上げ用の項目名 */
  label: string
}

/**
 * 選択肢が多くてピルに収まらない条件（市区町村・最寄駅）で使う。
 *
 * **束が2つ以上あるときだけ `<optgroup>` で府県名を出す。** 府県を1つに絞ったあとは
 * どれも同じ府県なので、見出しを重ねても読む手がかりにならない。
 */
export default function FilterSelect({ placeholder, value, groups, onChange, label }: Props) {
  const options = (group: SelectGroup) =>
    group.options.map(o => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))

  return (
    <select
      className="filter-select"
      aria-label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {groups.length > 1
        ? groups.map(g => (
            <optgroup key={g.label} label={g.label}>
              {options(g)}
            </optgroup>
          ))
        : groups.flatMap(options)}
    </select>
  )
}
