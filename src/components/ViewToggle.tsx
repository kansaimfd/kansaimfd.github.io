export type ViewMode = 'list' | 'table' | 'map'

interface Props {
  view: ViewMode
  onChangeView: (v: ViewMode) => void
  count: number
  /** 件数の単位。既定は「件」 */
  unit?: string
  /** 件数に添える補足。コンサートホールはホール単位で数えるので、施設数を添える */
  note?: string
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
export default function ViewToggle({ view, onChangeView, count, unit = '件', note }: Props) {
  return (
    <div className="result-bar">
      {/*
        絞り込みの結果は画面の別の場所が書き換わるだけなので、読み上げでは
        何件になったのかが分からない。role="status" で控えめに伝える
      */}
      <p className="result-bar__count" role="status">
        <span className="visually-hidden">該当</span>
        <strong>{count}</strong> {unit}
        {note && <span className="result-bar__note">（{note}）</span>}
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
