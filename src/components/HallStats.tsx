import type { ConcertHall } from '../types'
import RentalBadge from './RentalBadge'
import Stat from './Stat'

interface Props {
  halls: ConcertHall[]
  /** 貸館の状態がホールごとに分かれているときだけ、ホール名の横に出す */
  showRental: boolean
}

/**
 * 複数ホールを持つ施設のカードの数値の欄。
 * 1ホールのカードと同じ客席数・舞台寸法の表示をホールの数だけ縦に重ね、
 * それぞれの上にホール名を置く（見た目を1ホールのカードと揃えるため）。
 */
export default function HallStats({ halls, showRental }: Props) {
  return (
    <div className="hall-stats">
      {halls.map(h => (
        <div key={h.キー} className="hall-stats__hall">
          <p className="hall-stats__name">
            {h.部屋名 ?? '—'}
            {showRental && <RentalBadge 貸館={h.貸館} />}
          </p>
          <Stat values={[h.客席数]} unit="席" caption="CAPACITY" />
          <Stat values={[h.舞台幅, h.舞台奥行]} unit="m" caption="STAGE W×D" align="right" />
        </div>
      ))}
    </div>
  )
}
