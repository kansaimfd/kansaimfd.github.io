import { use, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { practiceFacility } from '../datasets/facility'
import { stationLabel } from '../station'
import InfoRow from '../components/InfoRow'
import SourceNote from '../components/SourceNote'
import { availabilityText, pianoDetail, standDetail } from '../availability'
import { fullAddress } from '../address'
import useDocumentTitle from '../useDocumentTitle'
import AvailabilityMark from '../components/AvailabilityMark'
import RentalBadge from '../components/RentalBadge'
import RentalNotice from '../components/RentalNotice'
import UsageConditionNote from '../components/UsageConditionNote'

// 地図は maplibre-gl（gzip で約420KB）を引き込むので、ページ本体と分けて後から読む。
// 待つあいだは同じ大きさの枠を置き、読み込み後に下の内容がずれないようにする
const DetailMap = lazy(() => import('../components/DetailMap'))

export default function PracticeDetailPage() {
  const { id } = useParams()
  // 知らないIDはその場で分かる。あれば、JSONが届くまでこの画面は中断する
  // （App の Suspense が読み込み中を出す）
  const pending = practiceFacility(Number(id))
  const practice = pending ? use(pending) : null

  // 見つからない場合も題名は要るので、早期 return より前で呼ぶ
  useDocumentTitle(practice?.施設名 ?? '施設が見つかりません')

  if (!practice) {
    return (
      <div className="detail">
        <p>施設が見つかりません。</p>
        <Link to="/practice" className="detail__back">
          ← 一覧に戻る
        </Link>
      </div>
    )
  }

  const p = practice

  const stationText = p.最寄駅?.map(stationLabel).join(' / ')

  // チェンバロを持つ施設は少ないので、記録がある施設でだけ列を出す
  const showChembalo = p.部屋?.some(r => r.チェンバロ != null) ?? false

  const rows: [string, string | number | undefined | null][] = [
    ['都道府県', p.都道府県],
    ['市区町村', p.市区町村],
    ['番地以下', p.番地以下],
    ['建物', p.建物],
    ['TEL', p.TEL],
    ['開館時間', p.開館時間 && p.閉館時間 ? `${p.開館時間} 〜 ${p.閉館時間}` : p.開館時間],
    ['休館日', p.休館日],
    ['最寄駅', stationText],
    // 情報表は項目名と値が並ぶ形なので、記号ではなく言葉で書く（読み上げでも同じ）
    ['ピアノ有無', p.ピアノ有無 != null ? availabilityText(p.ピアノ有無) : undefined],
    // 施設レベルの備品は、受付で申し込む貸出備品で設置部屋が決まっていない施設のためのもの
    [
      '譜面台',
      p.譜面台貸出 != null
        ? [availabilityText(p.譜面台貸出), standDetail(p)].filter(Boolean).join(' ')
        : undefined,
    ],
  ]

  return (
    <div className="detail" data-pref={p.都道府県}>
      <Link to="/practice" className="detail__back">
        ← 練習場一覧
      </Link>
      <header className="detail__head">
        <h1 className="detail__title">{p.施設名}</h1>
        <p className="detail__address">{fullAddress(p)}</p>
      </header>

      <RentalNotice 貸館={p.貸館} />
      <UsageConditionNote 利用条件={p.利用条件} />

      <Suspense fallback={<div className="map map--detail" />}>
        <DetailMap lat={p.緯度} lng={p.経度} name={p.施設名} 都道府県={p.都道府県} />
      </Suspense>

      <div className="detail__actions">
        {p.URL && (
          <a href={p.URL} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
            公式サイト
          </a>
        )}
        {p.申込URL && (
          <a href={p.申込URL} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
            申込
          </a>
        )}
        {p.料金URL && (
          <a href={p.料金URL} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
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

      {p.部屋 && p.部屋.length > 0 && (
        <div className="detail__section">
          <h2 className="section-title">部屋一覧</h2>
          <div className="table-wrap">
            <table className="data-table">
              <caption className="visually-hidden">{p.施設名}の部屋一覧</caption>
              <thead>
                <tr>
                  <th scope="col">部屋名</th>
                  <th scope="col" className="is-num">
                    面積(㎡)
                  </th>
                  <th scope="col" className="is-num">
                    定員
                  </th>
                  <th scope="col" className="is-center">
                    管楽器
                  </th>
                  <th scope="col" className="is-center">
                    打楽器
                  </th>
                  <th scope="col">ピアノ</th>
                  {showChembalo && (
                    <th scope="col" className="is-center">
                      チェンバロ
                    </th>
                  )}
                  <th scope="col">譜面台</th>
                </tr>
              </thead>
              <tbody>
                {p.部屋.map((r, i) => (
                  <tr key={i}>
                    <td>
                      {r.部屋名}
                      <RentalBadge 貸館={r.貸館} />
                      {r.楽器制限 && <span className="data-table__note">{r.楽器制限}</span>}
                    </td>
                    <td className="is-num">{r.面積 ?? '—'}</td>
                    <td className="is-num">{r.定員 ?? '—'}</td>
                    <td className="is-center">
                      <AvailabilityMark value={r.管楽器} />
                    </td>
                    <td className="is-center">
                      <AvailabilityMark value={r.打楽器} />
                    </td>
                    <td className="is-nowrap">
                      <AvailabilityMark value={r.ピアノ有無} detail={pianoDetail(r)} />
                    </td>
                    {showChembalo && (
                      <td className="is-center">
                        <AvailabilityMark value={r.チェンバロ} />
                      </td>
                    )}
                    <td className="is-nowrap">
                      <AvailabilityMark value={r.譜面台貸出} detail={standDetail(r)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SourceNote 出典={p.出典} 最終確認日={p.最終確認日} />
    </div>
  )
}
