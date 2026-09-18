import { useId, useState, type ReactNode } from 'react'

interface Props {
  /** 常に見えている行（フリーワード検索と並び替え） */
  head: ReactNode
  /** 折り畳む対象の絞り込み条件 */
  children: ReactNode
}

/**
 * 絞り込みパネル。
 *
 * **狭い画面では条件を畳む。** 開いたままだと絞り込みだけで初期表示が埋まり、
 * 施設が1件も見えないまま下へ送られる。検索欄と並び替えは畳まない（最もよく使うため）。
 * 640px 以上で常に開くのは CSS 側の担当で、ここでは状態を持つだけ。
 */
export default function FilterPanel({ head, children }: Props) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()

  return (
    <section className="filters">
      <div className="filters__head">{head}</div>
      <button
        type="button"
        className="filters__toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(v => !v)}
      >
        絞り込み条件
      </button>
      <div id={bodyId} className={open ? 'filters__body filters__body--open' : 'filters__body'}>
        {children}
      </div>
    </section>
  )
}
