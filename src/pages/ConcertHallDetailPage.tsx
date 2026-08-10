import { useParams, Link } from 'react-router-dom'
import { concerthallFacilities } from '../data'
import { stationLabel } from '../station'
import type { Hall } from '../types'
import DetailMap from '../components/DetailMap'
import InfoRow from '../components/InfoRow'
import SourceNote from '../components/SourceNote'
import { availabilityMark } from '../availability'
import { fullAddress } from '../address'

type Row = [string, string | number | undefined | null]

/** 舞台寸法をまとめて1つの表記にする。分かっている値だけを繋ぐ */
function stageLabel(h: Hall): string | undefined {
  const parts = [
    h.舞台幅 != null ? `幅${h.舞台幅}m` : null,
    h.舞台奥行 != null ? `奥行${h.舞台奥行}m` : null,
    h.舞台高さ != null ? `高さ${h.舞台高さ}m` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' × ') : undefined
}

export default function ConcertHallDetailPage() {
  const { id } = useParams()
  const facility = concerthallFacilities.find(f => f.ID === Number(id))

  if (!facility) {
    return (
      <div>
        <p className="text-gray-500">施設が見つかりません。</p>
        <Link to="/concert" className="text-gold-500 hover:text-gold-600 hover:underline mt-2 inline-block">← 一覧に戻る</Link>
      </div>
    )
  }

  const f = facility
  const rooms = f.部屋 ?? []

  const rows: Row[] = [
    ['都道府県', f.都道府県],
    ['市区町村', f.市区町村],
    ['番地以下', f.番地以下],
    ['建物', f.建物],
    ['分類', f.分類],
    ['築年月', f.築年月],
    ['最寄駅', f.最寄駅?.map(stationLabel).join(' / ')],
    ['駐車場', f.駐車場 != null ? `${f.駐車場}台` : undefined],
  ]

  return (
    <div className="max-w-2xl">
      <Link to="/concert" className="text-sm text-navy-700 hover:text-gold-500 transition-colors">← コンサートホール一覧</Link>
      <h1 className="text-2xl font-serif font-bold text-navy-700 mt-2 mb-1">{f.施設名}</h1>
      <p className="text-gray-500 mb-4">{fullAddress(f)}</p>

      <DetailMap lat={f.緯度} lng={f.経度} name={f.施設名} />

      <div className="flex flex-wrap gap-2 mt-4">
        {f.URL && <a href={f.URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-navy-700 text-white rounded-lg text-sm hover:bg-navy-800 transition-colors">公式サイト</a>}
        {f.申込URL && <a href={f.申込URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-navy-700 text-navy-700 rounded-lg text-sm hover:bg-navy-50 transition-colors">申込</a>}
        {f.料金URL && <a href={f.料金URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-navy-700 text-navy-700 rounded-lg text-sm hover:bg-navy-50 transition-colors">料金</a>}
      </div>

      <table className="w-full mt-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <InfoRow key={label} label={label as string} value={value as string | number | undefined} />
          ))}
        </tbody>
      </table>

      {rooms.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-semibold text-navy-700 mb-2">
            ホール一覧{rooms.length > 1 && <span className="font-normal text-gray-500 ml-1">（{rooms.length}）</span>}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">ホール名</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">客席数</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">舞台</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">ピアノ</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">オルガン</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">譜面台</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">親子室</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2">{r.部屋名 ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{r.客席数 != null ? `${r.客席数}席` : '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{stageLabel(r) ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{availabilityMark(r.ピアノ有無)}</td>
                    <td className="px-3 py-2 text-center">{availabilityMark(r.パイプオルガン)}</td>
                    <td className="px-3 py-2 text-center">{availabilityMark(r.譜面台貸出)}</td>
                    <td className="px-3 py-2 text-center">{availabilityMark(r.親子室)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SourceNote 出典={f.出典} 最終確認日={f.最終確認日} />
    </div>
  )
}
