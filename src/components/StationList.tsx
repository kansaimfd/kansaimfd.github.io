import type { Station } from '../types'
import { lineLabel, stationName, walkLabel } from '../station'

/**
 * 最寄駅を1駅1行で並べる。一覧のカードと詳細ページの見出しで同じ見た目にするため共通にしてある
 * （路線・出口・徒歩は薄く、駅名だけを濃くする）。
 */
export default function StationList({ stations }: { stations?: Station[] }) {
  if (!stations || stations.length === 0) return null
  return (
    <div className="station-list">
      {stations.map((s, i) => (
        <p key={i} className="station-list__item">
          {s.路線 && <span>{lineLabel(s)}</span>}
          <span className="station-list__name">{stationName(s)}</span>
          {s.出口 && <span>{s.出口}</span>}
          {walkLabel(s) && <span>{walkLabel(s)}</span>}
        </p>
      ))}
    </div>
  )
}
