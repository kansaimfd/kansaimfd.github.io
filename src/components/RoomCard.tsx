import type { ReactNode } from 'react'
import type { Availability, Rental } from '../types'
import type { Blank } from '../availability'
import AvailabilityMark from './AvailabilityMark'
import RentalBadge from './RentalBadge'

export interface Spec {
  label: string
  value: Availability | undefined
  /** 記号に添える補足 例: グランド・スタインウェイ */
  detail?: string
  /** 値が無いときの理由（未調査 / 公式に記載なし）。既定は未調査 */
  blank?: Blank
}

interface Props {
  name: string
  貸館?: Rental
  /** 部屋名の横に添える小さな印 例: 音楽専用 */
  tag?: string
  /** 客席数・舞台寸法などの数値の欄 */
  stats: ReactNode
  /**
   * 設備の3値。**「なし」と「未調査」を分けて出す**ので、バッジ（ありのときだけ出る）
   * ではなく記号の一覧にしている
   */
  specs: Spec[]
  /** 楽器制限などの補足 */
  note?: string
}

/**
 * 詳細ページの部屋1室。一覧のカードと同じく、数値は明朝の大きな字、
 * 英字の見出しを添える。コンサートホールと練習場で共通。
 */
export default function RoomCard({ name, 貸館, tag, stats, specs, note }: Props) {
  return (
    <article className="room-card">
      <div className="room-card__head">
        <h3 className="room-card__name">{name}</h3>
        {tag && <span className="room-card__tag">{tag}</span>}
        <RentalBadge 貸館={貸館} />
      </div>
      <div className="room-card__stats">{stats}</div>
      <dl className="room-card__specs">
        {specs.map(s => (
          <div
            key={s.label}
            className={s.value === true ? 'room-card__spec room-card__spec--on' : 'room-card__spec'}
          >
            <dt>{s.label}</dt>
            <dd>
              <AvailabilityMark value={s.value} detail={s.detail} blank={s.blank} />
            </dd>
          </div>
        ))}
      </dl>
      {note && <p className="room-card__note">{note}</p>}
    </article>
  )
}
