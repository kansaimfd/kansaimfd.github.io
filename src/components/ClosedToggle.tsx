import FilterRow from './FilterRow'

interface Props {
  on: boolean
  /** 一覧全体のうち、貸館を終えたもの（終了・廃止）の件数 */
  count: number
  onToggle: () => void
}

/**
 * 貸館を終えた施設を出すかどうか。**既定では出さない。**
 *
 * 借りられない施設が一覧に混ざっていると、探している人には邪魔になる。
 * ただ、閉館した施設を調べたい人もいるので、消すのではなく選べば出せるようにする。
 * 休止（再開予定あり）・予定（まだ借りられる）は対象にしない（→ rental.ts の isClosed）。
 *
 * 件数を添えるのは、押す前に「隠れているものがある」と分かるようにするため。
 */
export default function ClosedToggle({ on, count, onToggle }: Props) {
  if (count === 0) return null
  return (
    <FilterRow label="RENTAL" title="貸館">
      <button
        type="button"
        aria-pressed={on}
        onClick={onToggle}
        className={on ? 'pill pill--on' : 'pill'}
      >
        {on && <span className="pill__check">✓</span>}
        貸館終了・閉館も表示（{count}件）
      </button>
    </FilterRow>
  )
}
