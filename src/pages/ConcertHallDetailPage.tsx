import { useParams, Link } from 'react-router-dom'
import { concerthallFacilities } from '../datasets/concerthallFacilities'
import { stationLabel } from '../station'
import type { Hall } from '../types'
import DetailMap from '../components/DetailMap'
import InfoRow from '../components/InfoRow'
import SourceNote from '../components/SourceNote'
import { pianoDetail, standDetail } from '../availability'
import { fullAddress } from '../address'
import useDocumentTitle from '../useDocumentTitle'
import AvailabilityMark from '../components/AvailabilityMark'
import RentalBadge from '../components/RentalBadge'
import RentalNotice from '../components/RentalNotice'
import UsageConditionNote from '../components/UsageConditionNote'

type Row = [string, string | number | undefined | null]

/** 舞台寸法をまとめて1つの表記にする。分かっている値だけを繋ぐ */
function stageLabel(h: Hall): string | undefined {
  const parts = [
    h.舞台幅 != null ? `幅${h.舞台幅}m` : null,
    h.舞台奥行 != null ? `奥行${h.舞台奥行}m` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' × ') : undefined
}

export default function ConcertHallDetailPage() {
  const { id } = useParams()
  const facility = concerthallFacilities.find(f => f.ID === Number(id))

  // 施設が見つからない場合も題名は要るので、早期 return より前で呼ぶ
  useDocumentTitle(facility?.施設名 ?? '施設が見つかりません')

  if (!facility) {
    return (
      <div className="detail">
        <p>施設が見つかりません。</p>
        <Link to="/concert" className="detail__back">
          ← 一覧に戻る
        </Link>
      </div>
    )
  }

  const f = facility
  const rooms = f.部屋 ?? []

  // チェンバロを持つ施設は少ないので、記録がある施設でだけ列を出す
  const showChembalo = rooms.some(r => r.チェンバロ != null)

  const rows: Row[] = [
    ['都道府県', f.都道府県],
    ['市区町村', f.市区町村],
    ['番地以下', f.番地以下],
    ['建物', f.建物],
    ['築年月', f.築年月],
    ['最寄駅', f.最寄駅?.map(stationLabel).join(' / ')],
    ['駐車場', f.駐車場 != null ? `${f.駐車場}台` : undefined],
  ]

  return (
    <div className="detail" data-pref={f.都道府県}>
      <Link to="/concert" className="detail__back">
        ← コンサートホール一覧
      </Link>
      <header className="detail__head">
        <h1 className="detail__title">{f.施設名}</h1>
        <p className="detail__address">{fullAddress(f)}</p>
      </header>

      <RentalNotice 貸館={f.貸館} />
      <UsageConditionNote 利用条件={f.利用条件} />

      <DetailMap lat={f.緯度} lng={f.経度} name={f.施設名} />

      <div className="detail__actions">
        {f.URL && (
          <a href={f.URL} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
            公式サイト
          </a>
        )}
        {f.申込URL && (
          <a href={f.申込URL} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
            申込
          </a>
        )}
        {f.料金URL && (
          <a href={f.料金URL} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
            料金
          </a>
        )}
      </div>

      <div className="detail__section">
        <table className="info-table">
          <tbody>
            {rows.map(([label, value]) => (
              <InfoRow
                key={label}
                label={label as string}
                value={value as string | number | undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      {rooms.length > 0 && (
        <div className="detail__section">
          <h2 className="section-title">
            ホール一覧
            {rooms.length > 1 && <span className="section-title__note">（{rooms.length}）</span>}
          </h2>
          <div className="table-wrap">
            <table className="data-table">
              <caption className="visually-hidden">{f.施設名}のホール一覧</caption>
              <thead>
                <tr>
                  <th scope="col">ホール名</th>
                  <th scope="col">種別</th>
                  <th scope="col" className="is-num">
                    客席数
                  </th>
                  <th scope="col">舞台</th>
                  <th scope="col" className="is-num">
                    楽屋(名)
                  </th>
                  <th scope="col">ピアノ</th>
                  <th scope="col" className="is-center">
                    オルガン
                  </th>
                  {showChembalo && (
                    <th scope="col" className="is-center">
                      チェンバロ
                    </th>
                  )}
                  <th scope="col">譜面台</th>
                  <th scope="col" className="is-center">
                    親子室
                  </th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r, i) => (
                  <tr key={i}>
                    <td>
                      {r.部屋名 ?? '—'}
                      <RentalBadge 貸館={r.貸館} />
                    </td>
                    <td className="is-nowrap">{r.ホール種別 ?? '—'}</td>
                    <td className="is-num">{r.客席数 != null ? `${r.客席数}席` : '—'}</td>
                    <td className="is-nowrap">{stageLabel(r) ?? '—'}</td>
                    <td className="is-num">{r.楽屋収容人数 ?? '—'}</td>
                    <td className="is-nowrap">
                      <AvailabilityMark value={r.ピアノ有無} detail={pianoDetail(r)} />
                    </td>
                    <td className="is-nowrap">
                      <AvailabilityMark value={r.パイプオルガン} />
                      {r.オルガン製作者 && (
                        <span className="data-table__note">{r.オルガン製作者}</span>
                      )}
                    </td>
                    {showChembalo && (
                      <td className="is-center">
                        <AvailabilityMark value={r.チェンバロ} />
                      </td>
                    )}
                    <td className="is-nowrap">
                      <AvailabilityMark value={r.譜面台貸出} detail={standDetail(r)} />
                    </td>
                    <td className="is-center">
                      <AvailabilityMark value={r.親子室} />
                    </td>
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
