import { useParams, Link } from 'react-router-dom'
import { concerthalls } from '../data'
import DetailMap from '../components/DetailMap'
import InfoRow from '../components/InfoRow'

type Row = [string, string | number | undefined | null]

export default function ConcertHallDetailPage() {
  const { id } = useParams()
  const hall = concerthalls.find(h => h.ID === Number(id))

  if (!hall) {
    return (
      <div>
        <p className="text-gray-500">施設が見つかりません。</p>
        <Link to="/concert" className="text-gold-500 hover:text-gold-600 hover:underline mt-2 inline-block">← 一覧に戻る</Link>
      </div>
    )
  }

  const rows: Row[] = [
    ['都道府県', hall.都道府県],
    ['市区町村', hall.市区町村],
    ['番地以下', hall.番地以下],
    ['分類', hall.分類],
    ['築年月', hall.築年月],
    ['最寄駅', hall.最寄駅?.map(s => `${s.路線 ? s.路線 + ' ' : ''}${s.駅}${s.駅徒歩 != null ? `（徒歩${s.駅徒歩}分）` : ''}`).join(' / ')],
    ['客席数', hall.客席数 != null ? `${hall.客席数}席` : undefined],
    ['駐車場', hall.駐車場 != null ? `${hall.駐車場}台` : undefined],
    ['舞台', hall.舞台幅 != null ? `幅${hall.舞台幅}m × 奥行${hall.舞台奥行}m × 高さ${hall.舞台高さ}m` : undefined],
    ['ピアノ有無', hall.ピアノ有無],
    ['パイプオルガン', hall.パイプオルガン],
    ['譜面台貸出', hall.譜面台貸出],
    ['親子室', hall.親子室],
  ]

  return (
    <div className="max-w-2xl">
      <Link to="/concert" className="text-sm text-navy-700 hover:text-gold-500 transition-colors">← コンサートホール一覧</Link>
      <h1 className="text-2xl font-serif font-bold text-navy-700 mt-2 mb-1">
        {hall.施設名}
        {hall.部屋名 && <span className="text-lg font-normal text-gray-500 ml-2">({hall.部屋名})</span>}
      </h1>
      <p className="text-gray-500 mb-4">{hall.都道府県} {hall.市区町村} {hall.番地以下}</p>

      <DetailMap lat={hall.緯度} lng={hall.経度} name={hall.施設名} />

      <div className="flex flex-wrap gap-2 mt-4">
        {hall.URL && <a href={hall.URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-navy-700 text-white rounded-lg text-sm hover:bg-navy-800 transition-colors">公式サイト</a>}
        {hall.申込URL && <a href={hall.申込URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-navy-700 text-navy-700 rounded-lg text-sm hover:bg-navy-50 transition-colors">申込</a>}
        {hall.料金URL && <a href={hall.料金URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-navy-700 text-navy-700 rounded-lg text-sm hover:bg-navy-50 transition-colors">料金</a>}
      </div>

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
