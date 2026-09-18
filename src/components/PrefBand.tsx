import { prefRomaji } from '../pref'

/**
 * カード上端の府県帯。色は `data-pref` を見た CSS が決めるので、
 * ここは「どの府県か」だけを伝える。
 */
export default function PrefBand({ 都道府県 }: { 都道府県: string }) {
  return (
    <div className="facility-card__band">
      <span className="facility-card__dot" />
      <span className="facility-card__pref">{都道府県}</span>
      <span className="facility-card__romaji">{prefRomaji(都道府県)}</span>
    </div>
  )
}
