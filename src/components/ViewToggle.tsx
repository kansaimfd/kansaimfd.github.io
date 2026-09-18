export type ViewMode = 'list' | 'table' | 'map'

interface Props {
  view: ViewMode
  onChangeView: (v: ViewMode) => void
  count: number
}

const LABEL: Record<ViewMode, string> = {
  list: 'リスト',
  table: '表',
  map: '地図',
}

/**
 * 件数と表示の切り替え。
 *
 * 件数を切り替えと同じ行に置いているのは、絞り込んだ結果が何件になったのかが
 * 分からないまま延々スクロールする状態を作らないため。
 */
export default function ViewToggle({ view, onChangeView, count }: Props) {
  return (
    <div className="result-bar">
      <p className="result-bar__count">
        <strong>{count}</strong> 件
      </p>
      <div className="view-toggle">
        {(Object.keys(LABEL) as ViewMode[]).map(v => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => onChangeView(v)}
            className={view === v ? 'view-toggle__btn view-toggle__btn--on' : 'view-toggle__btn'}
          >
            {LABEL[v]}
          </button>
        ))}
      </div>
    </div>
  )
}
