import { useParams, Link } from 'react-router-dom'
import { practices } from '../data'
import DetailMap from '../components/DetailMap'
import InfoRow from '../components/InfoRow'
import type { Station } from '../types'

export default function PracticeDetailPage() {
  const { id } = useParams()
  const practice = practices.find(p => p.ID === Number(id))

  if (!practice) {
    return (
      <div>
        <p className="text-gray-500">施設が見つかりません。</p>
        <Link to="/practice" className="text-blue-600 hover:underline mt-2 inline-block">← 一覧に戻る</Link>
      </div>
    )
  }

  const p = practice

  const stationText = Array.isArray(p.最寄駅)
    ? (p.最寄駅 as Station[]).map(s => `${s.路線 ? s.路線 + ' ' : ''}${s.駅}${s.駅徒歩 != null ? `（徒歩${s.駅徒歩}分）` : ''}`).join(' / ')
    : p.最寄駅 ? `${p.最寄駅}${p.最寄駅徒歩 != null ? `（徒歩${p.最寄駅徒歩}分）` : ''}` : undefined

  const rows: [string, string | number | undefined | null][] = [
    ['都道府県', p.都道府県],
    ['市区町村', p.市区町村],
    ['番地以下', p.番地以下],
    ['TEL', p.TEL],
    ['開館時間', p.開館時間 && p.閉館時間 ? `${p.開館時間} 〜 ${p.閉館時間}` : p.開館時間],
    ['休館日', p.休館日],
    ['分類', p.分類],
    ['最寄駅', stationText],
    ['ピアノ有無', p.ピアノ有無],
  ]

  return (
    <div className="max-w-2xl">
      <Link to="/practice" className="text-sm text-navy-700 hover:text-gold-500 transition-colors">← 練習場一覧</Link>
      <h1 className="text-2xl font-serif font-bold text-navy-700 mt-2 mb-1">{p.施設名}</h1>
      <p className="text-gray-500 mb-4">{p.都道府県} {p.市区町村} {p.番地以下}</p>

      <DetailMap lat={p.緯度} lng={p.経度} name={p.施設名} />

      <div className="mt-4 flex flex-wrap gap-2">
        {p.URL && (
          <a href={p.URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-navy-700 text-white rounded-lg text-sm hover:bg-navy-800 transition-colors">公式サイト</a>
        )}
        {p.申込URL && (
          <a href={p.申込URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-navy-700 text-navy-700 rounded-lg text-sm hover:bg-navy-50 transition-colors">申込</a>
        )}
        {p.料金URL && (
          <a href={p.料金URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-navy-700 text-navy-700 rounded-lg text-sm hover:bg-navy-50 transition-colors">料金</a>
        )}
      </div>

      <table className="w-full mt-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <InfoRow key={label} label={label as string} value={value as string | number | undefined} />
          ))}
        </tbody>
      </table>

      {p.部屋 && p.部屋.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-semibold text-navy-700 mb-2">部屋一覧</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">部屋名</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">面積(㎡)</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">定員</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">ピアノ</th>
                </tr>
              </thead>
              <tbody>
                {p.部屋.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2">{r.部屋名}</td>
                    <td className="px-3 py-2 text-right">{r.面積 ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{r.定員 ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{r.ピアノ有無 ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
