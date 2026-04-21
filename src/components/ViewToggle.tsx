export type ViewMode = 'list' | 'table' | 'map'

interface Props {
  view: ViewMode
  onChangeView: (v: ViewMode) => void
  count: number
}

export default function ViewToggle({ view, onChangeView, count }: Props) {
  return (
    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
      <span className="text-sm text-gray-500">{count} 件</span>
      <div className="flex gap-2">
        {(['list', 'table', 'map'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => onChangeView(v)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              view === v
                ? 'bg-navy-700 text-white border-navy-700'
                : 'bg-white text-gray-600 border-gray-300 hover:border-navy-700 hover:text-navy-700'
            }`}
          >
            {v === 'list' ? 'リスト' : v === 'table' ? '表' : '地図'}
          </button>
        ))}
      </div>
    </div>
  )
}
