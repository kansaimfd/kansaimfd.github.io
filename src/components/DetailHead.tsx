import type { ReactNode } from 'react'
import type { FacilityBase } from '../types'
import { fullAddress } from '../address'
import PrefBand from './PrefBand'
import StationList from './StationList'

type HeadFacility = Pick<
  FacilityBase,
  | '施設名'
  | '都道府県'
  | '市区町村'
  | '番地以下'
  | '建物'
  | '最寄駅'
  | 'URL'
  | '申込URL'
  | '料金URL'
>

interface Props {
  facility: HeadFacility
  /** 帯の右端に出す英字の種別 例: CONCERT HALL */
  label: string
  /** 施設全体の数値（ホール数・最大客席数など）。分かっているものだけを渡す */
  stats: ReactNode
  /** 設備バッジの並び */
  equip: ReactNode
}

/**
 * 詳細ページの見出し。**一覧のカードと同じ組み立て**（府県帯・明朝の施設名・
 * 数値の欄・設備バッジ）にして、一覧から来たときに同じ施設だと一目で分かるようにする。
 * 公式サイト・申込・料金のリンクもここにまとめる。
 */
export default function DetailHead({ facility: f, label, stats, equip }: Props) {
  return (
    <header className="detail-head" data-pref={f.都道府県}>
      <PrefBand 都道府県={f.都道府県} label={label} />
      <div className="detail-head__body">
        <div className="detail-head__main">
          <h1 className="detail-head__title">{f.施設名}</h1>
          <p className="detail-head__address">{fullAddress(f)}</p>
          <StationList stations={f.最寄駅} />

          <div className="detail-head__actions">
            {f.URL && (
              <a
                href={f.URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--primary"
              >
                公式サイト
              </a>
            )}
            {f.申込URL && (
              <a
                href={f.申込URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--ghost"
              >
                申込
              </a>
            )}
            {f.料金URL && (
              <a
                href={f.料金URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--ghost"
              >
                料金
              </a>
            )}
          </div>
        </div>

        <div className="detail-head__side">
          <div className="detail-head__stats">{stats}</div>
          <div className="detail-head__equip">{equip}</div>
        </div>
      </div>
    </header>
  )
}
