import type { Availability } from '../types'
import { availabilityMark, availabilityText } from '../availability'

interface Props {
  value: Availability | undefined
  /** 記号に添える補足 例: グランド・スタインウェイ / 5本 */
  detail?: string
}

/**
 * 表の中の「〇 / × / —」。
 *
 * 見た目は記号のままで、読み上げには言葉を渡す。設備を3値で持っているのは
 * 「なし」と「未調査」を混同させないためなのに、記号だけを置くと読み上げでは
 * 「—」が無音かダッシュになり、その区別が丸ごと消える。
 */
export default function AvailabilityMark({ value, detail }: Props) {
  return (
    <>
      <span aria-hidden>{availabilityMark(value)}</span>
      <span className="visually-hidden">{availabilityText(value)}</span>
      {detail && <span> {detail}</span>}
    </>
  )
}
