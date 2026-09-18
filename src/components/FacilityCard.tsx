import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { FacilityBase, HallType } from '../types'
import { lineLabel, stationName, walkLabel } from '../station'
import { localAddress } from '../address'
import PrefBand from './PrefBand'
import RentalBadge from './RentalBadge'
import UsageConditionBadge from './UsageConditionBadge'

/**
 * カードが読む分だけを FacilityBase から取る。コンサートホール（平坦化済み）と
 * 練習場の両方を受けるため、片方にしか無い項目は任意にしてある。
 */
type CardFacility = Pick<
  FacilityBase,
  | 'ID'
  | '施設名'
  | '都道府県'
  | '市区町村'
  | '番地以下'
  | '建物'
  | '最寄駅'
  | 'URL'
  | '貸館'
  | '利用条件'
> & {
  部屋名?: string
  ホール種別?: HallType
}

interface Props {
  facility: CardFacility
  /** 詳細ページの接頭辞 例: /concert */
  detailBasePath: string
  /** 客席数・定員など、一覧ごとに変わる数値の欄 */
  stats: ReactNode
  /** 設備バッジの並び */
  equip: ReactNode
}

/**
 * 一覧の1行。**コンサートホールと練習場で同じ部品を使う。**
 *
 * 施設名・住所・アクセス・貸館の状態といった共通部分をここに集めてあり、
 * 一覧ごとに変わるのは数値の欄と設備バッジだけ。以前は一覧ごとにカードを
 * 別々に書いていて、片方だけ手を入れた結果2つの見た目に分かれた。
 */
export default function FacilityCard({ facility: f, detailBasePath, stats, equip }: Props) {
  return (
    <article className="facility-card" data-pref={f.都道府県}>
      <PrefBand 都道府県={f.都道府県} />
      <div className="facility-card__body">
        <div className="facility-card__main">
          <div className="facility-card__title-row">
            <Link to={`${detailBasePath}/${f.ID}`} className="facility-card__name">
              {f.施設名}
            </Link>
            {f.部屋名 && <span className="facility-card__room">（{f.部屋名}）</span>}
            <RentalBadge 貸館={f.貸館} />
            <UsageConditionBadge 利用条件={f.利用条件} />
            {f.ホール種別 && <span className="facility-card__type">{f.ホール種別}</span>}
          </div>

          <p className="facility-card__address">{localAddress(f)}</p>

          {f.最寄駅 && f.最寄駅.length > 0 && (
            <div className="facility-card__access">
              {f.最寄駅.map((s, i) => (
                <p key={i} className="facility-card__station">
                  {s.路線 && <span>{lineLabel(s)}</span>}
                  <span className="facility-card__station-name">{stationName(s)}</span>
                  {s.出口 && <span>{s.出口}</span>}
                  {walkLabel(s) && <span>{walkLabel(s)}</span>}
                </p>
              ))}
            </div>
          )}

          {f.URL && (
            <a
              href={f.URL}
              target="_blank"
              rel="noopener noreferrer"
              className="facility-card__official"
            >
              公式サイト
              <svg
                width="9"
                height="9"
                viewBox="0 0 9 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M2 2h5v5M2 7L7 2" />
              </svg>
            </a>
          )}
        </div>

        <div className="facility-card__stats">{stats}</div>
        <div className="facility-card__equip">{equip}</div>
      </div>
    </article>
  )
}
