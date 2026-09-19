import type { Availability } from '../types'
import { availabilityMark, availabilityText, type Blank } from '../availability'

interface Props {
  value: Availability | undefined
  /** 値が無いときの理由。既定は未調査 */
  blank?: Blank
  /** 記号に添える補足 例: グランド・スタインウェイ / 5本 */
  detail?: string
}

/** 記号の色分け。「あり」だけを設備バッジと同じゴールドで立たせる */
const MODIFIER: Record<string, string> = { true: 'on', false: 'off' }

/**
 * 表の中の「〇 / × / —」。
 *
 * 見た目は記号のままで、読み上げには言葉を渡す。設備を3値で持っているのは
 * 「なし」と「未調査」を混同させないためなのに、記号だけを置くと読み上げでは
 * 「—」が無音かダッシュになり、その区別が丸ごと消える。
 */
export default function AvailabilityMark({ value, detail, blank = '未調査' }: Props) {
  const modifier = MODIFIER[String(value)] ?? (blank === '記載なし' ? 'blank' : 'unknown')
  return (
    <>
      <span aria-hidden className={`avail-mark avail-mark--${modifier}`}>
        {availabilityMark(value, blank)}
      </span>
      <span className="visually-hidden">{availabilityText(value, blank)}</span>
      {detail && <span> {detail}</span>}
    </>
  )
}
