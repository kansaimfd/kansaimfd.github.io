import { use, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { concertHallFacility } from '../datasets/facility'
import type { Hall } from '../types'
import InfoRow from '../components/InfoRow'
import SourceNote from '../components/SourceNote'
import { blankOf, pianoDetail, standDetail, valueOrNotStated } from '../availability'
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
function maxOf(rooms: Hall[], pick: (r: Hall) => number | undefined): number | undefined {
  const values = rooms.map(pick).filter((v): v is number => v != null)
  return values.length > 0 ? Math.max(...values) : undefined
}

/**
 * ホールの数値の欄。客席のある部屋は客席数と舞台寸法、
 * 客席の無い部屋（併設のスタジオ・練習室）は定員と面積を出す。
 * **分かっている数値だけを出す**（見出しの無い「—」が並んでも何の欄か分からない）。
 * 舞台寸法は片方しか分からないホールもある（なら100年会館は奥行だけ）。Stat は片方が
 * 欠けると全体を「—」にするので、そのときは幅と奥行を別々に出す
 */
function HallRoomStats({ r }: { r: Hall }) {
  const bothStage = r.舞台幅 != null && r.舞台奥行 != null
  return (
    <>
      {r.客席数 != null && <Stat values={[r.客席数]} unit="席" caption="CAPACITY" />}
      {bothStage && <Stat values={[r.舞台幅, r.舞台奥行]} unit="m" caption="STAGE W×D" />}
      {!bothStage && r.舞台幅 != null && (
        <Stat values={[r.舞台幅]} unit="m" caption="STAGE WIDTH" />
      )}
      {!bothStage && r.舞台奥行 != null && (
        <Stat values={[r.舞台奥行]} unit="m" caption="STAGE DEPTH" />
      )}
      {r.楽屋収容人数 != null && (
        <Stat values={[r.楽屋収容人数]} unit="名" caption="DRESSING ROOMS" />
      )}
      {r.客席数 == null && r.定員 != null && (
        <Stat values={[r.定員]} unit="名" caption="CAPACITY" />
      )}
      {r.面積 != null && <Stat values={[r.面積]} unit="㎡" caption="AREA" />}
    </>
  )
}

/** 部屋の設備の3値。持っている施設が少ない項目は、記録がある場合だけ並べる */
function hallSpecs(r: Hall, showChembalo: boolean): Spec[] {
  const specs: Spec[] = [
    {
      label: 'ピアノ',
      value: r.ピアノ有無,
      detail: pianoDetail(r),
      blank: blankOf(r, 'ピアノ有無'),
    },
    {
      label: 'パイプオルガン',
      value: r.パイプオルガン,
      detail: r.オルガン製作者,
      blank: blankOf(r, 'パイプオルガン'),
    },
  ]
  if (showChembalo)
    specs.push({ label: 'チェンバロ', value: r.チェンバロ, blank: blankOf(r, 'チェンバロ') })
  specs.push({
    label: '譜面台',
    value: r.譜面台貸出,
    detail: standDetail(r),
    blank: blankOf(r, '譜面台貸出'),
  })
  specs.push({ label: '親子室', value: r.親子室, blank: blankOf(r, '親子室') })
  // 併設の練習室にだけ書かれる項目。ホールで「未調査」を並べても手がかりにならない。
  // 練習室なら「公式に記載なし」は手がかりなので出す。客席のあるホールには出さない
  // （出典の記載なしは施設の全室に配られるので、ホールにも付いてしまう）
  for (const [label, key] of [
    ['管楽器', '管楽器'],
    ['打楽器', '打楽器'],
  ] as const) {
    const notStated = r.客席数 == null && blankOf(r, key) === '記載なし'
    if (r[key] != null || notStated) specs.push({ label, value: r[key], blank: blankOf(r, key) })
  }
  return specs
}

export default function ConcertHallDetailPage() {
  const { id } = useParams()
  // 知らないIDはその場で分かる。あれば、JSONが届くまでこの画面は中断する
  // （App の Suspense が読み込み中を出す）
  const pending = concertHallFacility(Number(id))
  const facility = pending ? use(pending) : null

  // 見つからない場合も題名は要るので、早期 return より前で呼ぶ
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

  // チェンバロを持つ施設は少ないので、記録がある施設でだけ項目を出す
  const showChembalo = rooms.some(r => r.チェンバロ != null)

  const maxSeats = maxOf(rooms, r => r.客席数)
  const builtYear = f.築年月 ? Number(f.築年月.slice(0, 4)) : undefined

  // 住所と最寄駅は見出しに出しているので、ここには重ねない
  const rows = (
    [
      ['TEL', valueOrNotStated(f.TEL, f, 'TEL')],
      [
        '開館時間',
        f.開館時間 && f.閉館時間
          ? `${f.開館時間} 〜 ${f.閉館時間}`
          : valueOrNotStated(f.開館時間, f, '開館時間'),
      ],
      ['休館日', valueOrNotStated(f.休館日, f, '休館日')],
      ['築年月', valueOrNotStated(f.築年月, f, '築年月')],
      ['駐車場', valueOrNotStated(f.駐車場 != null ? `${f.駐車場}台` : undefined, f, '駐車場')],
    ] satisfies Row[]
  ).filter(([, v]) => v != null && v !== '')

  return (
    <div className="detail" data-pref={f.都道府県}>
      {/* 確認日は一覧へ戻るリンクと同じ行に置く。情報の鮮度は読み始める前に分かる方がよい */}
      <div className="detail__topbar">
        <Link to="/concert" className="detail__back">
          ← コンサートホール一覧
        </Link>
        <SourceNote 出典={f.出典} 最終確認日={f.最終確認日} />
      </div>

      <DetailHead
        facility={f}
        label="CONCERT HALL"
        stats={
          <>
            {rooms.length > 0 && <Stat values={[rooms.length]} unit="室" caption="ROOMS" />}
            {maxSeats != null && <Stat values={[maxSeats]} unit="席" caption="MAX CAPACITY" />}
            {builtYear != null && <Stat values={[builtYear]} unit="年" caption="OPENED" />}
            {f.駐車場 != null && <Stat values={[f.駐車場]} unit="台" caption="PARKING" />}
          </>
        }
        // 設備はどれかの部屋にあれば出す（どの部屋かは下の部屋ごとの欄で分かる）
        equip={
          <>
            <EquipBadge label="ピアノ" on={rooms.some(r => r.ピアノ有無 === true)} />
            <EquipBadge label="オルガン" on={rooms.some(r => r.パイプオルガン === true)} />
            <EquipBadge label="チェンバロ" on={rooms.some(r => r.チェンバロ === true)} />
            <EquipBadge label="譜面台" on={rooms.some(r => r.譜面台貸出 === true)} />
            <EquipBadge label="親子室" on={rooms.some(r => r.親子室 === true)} />
            <EquipBadge label="駐車場" on={f.駐車場 != null && f.駐車場 > 0} />
          </>
        }
      />

      <RentalNotice 貸館={f.貸館} />
      <UsageConditionNote 利用条件={f.利用条件} />

      {rooms.length > 0 && (
        <section className="detail__section">
          <SectionHead
            label="HALLS & ROOMS"
            title="ホール・部屋"
            note={rooms.length > 1 ? `${rooms.length}室` : undefined}
          />
          <div className="room-list">
            {rooms.map((r, i) => (
              <RoomCard
                key={i}
                name={r.部屋名 ?? f.施設名}
                貸館={r.貸館}
                tag={r.ホール種別}
                stats={<HallRoomStats r={r} />}
                specs={hallSpecs(r, showChembalo)}
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
            <DetailMap lat={f.緯度} lng={f.経度} name={f.施設名} 都道府県={f.都道府県} />
          </Suspense>
        </section>
      </div>
    </div>
  )
}
