import { use, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { practiceFacility } from '../datasets/facility'
import type { PracticeRoom } from '../types'
import InfoRow from '../components/InfoRow'
import SourceNote from '../components/SourceNote'
import { availabilityText, pianoDetail, standDetail } from '../availability'
import { PRACTICE_EQUIP_FIELDS } from '../practice'
import useDocumentTitle from '../useDocumentTitle'
import RentalNotice from '../components/RentalNotice'
import UsageConditionNote from '../components/UsageConditionNote'
import DetailHead from '../components/DetailHead'
import SectionHead from '../components/SectionHead'
import RoomCard, { type Spec } from '../components/RoomCard'
import Stat from '../components/Stat'
import EquipBadge from '../components/EquipBadge'

// 地図は maplibre-gl（gzip で約420KB）を引き込むので、ページ本体と分けて後から読む。
// 待つあいだは同じ大きさの枠を置き、読み込み後に下の内容がずれないようにする
const DetailMap = lazy(() => import('../components/DetailMap'))

type Row = [string, string | number | undefined | null]

/** 部屋の数値のうち最大のもの。1室も分かっていなければ undefined */
function maxOf(
  rooms: PracticeRoom[],
  pick: (r: PracticeRoom) => number | undefined,
): number | undefined {
  const values = rooms.map(pick).filter((v): v is number => v != null)
  return values.length > 0 ? Math.max(...values) : undefined
}

/** 部屋の設備の3値。チェンバロは持つ施設が少ないので、記録がある施設でだけ並べる */
function roomSpecs(r: PracticeRoom, showChembalo: boolean): Spec[] {
  const specs: Spec[] = [
    { label: '管楽器', value: r.管楽器 },
    { label: '打楽器', value: r.打楽器 },
    { label: 'ピアノ', value: r.ピアノ有無, detail: pianoDetail(r) },
  ]
  if (showChembalo) specs.push({ label: 'チェンバロ', value: r.チェンバロ })
  specs.push({ label: '譜面台', value: r.譜面台貸出, detail: standDetail(r) })
  return specs
}

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
  const rooms = p.部屋 ?? []

  // チェンバロを持つ施設は少ないので、記録がある施設でだけ項目を出す
  const showChembalo = rooms.some(r => r.チェンバロ != null)

  const maxCapacity = maxOf(rooms, r => r.定員)
  const maxArea = maxOf(rooms, r => r.面積)

  // 住所と最寄駅は見出しに出しているので、ここには重ねない
  const rows = (
    [
      ['TEL', p.TEL],
      ['開館時間', p.開館時間 && p.閉館時間 ? `${p.開館時間} 〜 ${p.閉館時間}` : p.開館時間],
      ['休館日', p.休館日],
      ['駐車場', p.駐車場 != null ? `${p.駐車場}台` : undefined],
      // 情報表は項目名と値が並ぶ形なので、記号ではなく言葉で書く（読み上げでも同じ）
      // 施設レベルの備品は、受付で申し込む貸出備品で設置部屋が決まっていない施設のためのもの
      ['貸出ピアノ', p.ピアノ有無 != null ? availabilityText(p.ピアノ有無) : undefined],
      [
        '貸出譜面台',
        p.譜面台貸出 != null
          ? [availabilityText(p.譜面台貸出), standDetail(p)].filter(Boolean).join(' ')
          : undefined,
      ],
    ] satisfies Row[]
  ).filter(([, v]) => v != null && v !== '')

  return (
    <div className="detail" data-pref={p.都道府県}>
      {/* 確認日は一覧へ戻るリンクと同じ行に置く。情報の鮮度は読み始める前に分かる方がよい */}
      <div className="detail__topbar">
        <Link to="/practice" className="detail__back">
          ← 練習場一覧
        </Link>
        <SourceNote 出典={p.出典} 最終確認日={p.最終確認日} />
      </div>

      <DetailHead
        facility={p}
        label="PRACTICE ROOM"
        stats={
          <>
            {rooms.length > 0 && <Stat values={[rooms.length]} unit="室" caption="ROOMS" />}
            {maxCapacity != null && (
              <Stat values={[maxCapacity]} unit="名" caption="MAX CAPACITY" />
            )}
            {maxArea != null && <Stat values={[maxArea]} unit="㎡" caption="MAX AREA" />}
            {p.駐車場 != null && <Stat values={[p.駐車場]} unit="台" caption="PARKING" />}
          </>
        }
        // 一覧のバッジと同じ判定を使う（施設レベルの貸出ピアノも手がかりに含める）
        equip={
          <>
            {PRACTICE_EQUIP_FIELDS.map(e => (
              <EquipBadge key={e.key} label={e.badge} on={e.state(p) === true} />
            ))}
            <EquipBadge
              label="譜面台"
              on={p.譜面台貸出 === true || rooms.some(r => r.譜面台貸出 === true)}
            />
            <EquipBadge label="駐車場" on={p.駐車場 != null && p.駐車場 > 0} />
          </>
        }
      />

      <RentalNotice 貸館={p.貸館} />
      <UsageConditionNote 利用条件={p.利用条件} />

      {rooms.length > 0 && (
        <section className="detail__section">
          <SectionHead
            label="ROOMS"
            title="部屋"
            note={rooms.length > 1 ? `${rooms.length}室` : undefined}
          />
          <div className="room-list">
            {rooms.map((r, i) => (
              <RoomCard
                key={i}
                name={r.部屋名}
                貸館={r.貸館}
                // 分かっている数値だけを出す（見出しの無い「—」が並んでも何の欄か分からない）
                stats={
                  <>
                    {r.定員 != null && <Stat values={[r.定員]} unit="名" caption="CAPACITY" />}
                    {r.面積 != null && <Stat values={[r.面積]} unit="㎡" caption="AREA" />}
                  </>
                }
                specs={roomSpecs(r, showChembalo)}
                note={r.楽器制限}
              />
            ))}
          </div>
        </section>
      )}

      <div className="detail__grid">
        {rows.length > 0 && (
          <section className="detail__section">
            <SectionHead label="INFORMATION" title="施設情報" />
            <table className="info-table">
              <tbody>
                {rows.map(([label, value]) => (
                  <InfoRow key={label} label={label} value={value} />
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="detail__section">
          <SectionHead label="LOCATION" title="地図" />
          <Suspense fallback={<div className="map map--detail" />}>
            <DetailMap lat={p.緯度} lng={p.経度} name={p.施設名} 都道府県={p.都道府県} />
          </Suspense>
        </section>
      </div>
    </div>
  )
}
