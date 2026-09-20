interface Props {
  /** 選ばれているか。`aria-pressed` と見た目の両方に効く */
  on: boolean
  label: string
  onClick: () => void
  /** 府県のピルだけ。色は `data-pref` から CSS が決める（→ tokens.css） */
  pref?: string
  /** 設備のピル。選ばれているときの色がゴールドになる */
  equip?: boolean
}

/**
 * 押すたびに入り切りが変わる絞り込みのピル。
 *
 * 府県・設備・貸館で同じマークアップ（`aria-pressed` と ✓ と
 * `pill--on` の付け外し）を5か所に書いていた。**押せることを伝えるのは
 * クラス名ではなく `aria-pressed`** なので、書き分けると片方だけ落ちる。
 */
export default function Pill({ on, label, onClick, pref, equip }: Props) {
  const className = ['pill', equip && 'pill--equip', on && 'pill--on'].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      data-pref={pref}
      aria-pressed={on}
      onClick={onClick}
      className={className}
    >
      {on && <span className="pill__check">✓</span>}
      {label}
    </button>
  )
}
