import { useParams, Link } from 'react-router-dom'
import { practices } from '../data'
import DetailMap from '../components/DetailMap'

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null
  return (
    <tr className="border-b">
      <th className="px-3 py-2 text-left text-sm text-gray-500 font-medium whitespace-nowrap w-36 bg-gray-50">{label}</th>
      <td className="px-3 py-2 text-sm">{String(value)}</td>
    </tr>
  )
}

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
  const rows: [string, string | number | undefined | null][] = [
    ['都道府県', p.都道府県],
    ['市区町村', p.市区町村],
    ['番地以下', p.番地以下],
    ['分類', p.分類],
    ['最寄駅', p.最寄駅 ? `${p.最寄駅}${p.最寄駅徒歩 != null ? `（徒歩${p.最寄駅徒歩}分）` : ''}` : undefined],
    ['ピアノ有無', p.ピアノ有無],
  ]

  return (
    <div className="max-w-2xl">
      <Link to="/practice" className="text-sm text-navy-700 hover:text-gold-500 transition-colors">← 練習場一覧</Link>
      <h1 className="text-2xl font-serif font-bold text-navy-700 mt-2 mb-1">{p.施設名}</h1>
      <p className="text-gray-500 mb-4">{p.都道府県} {p.市区町村} {p.番地以下}</p>

      <DetailMap lat={p.緯度} lng={p.経度} name={p.施設名} />

      {p.URL && (
        <div className="mt-4">
          <a href={p.URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-navy-700 text-white rounded-lg text-sm hover:bg-navy-800 transition-colors">公式サイト</a>
        </div>
      )}

      <table className="w-full mt-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <InfoRow key={label} label={label as string} value={value as string | number | undefined} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
