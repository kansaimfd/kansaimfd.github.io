import { prefRomaji } from '../pref'

/**
 * カード上端の府県帯。色は `data-pref` を見た CSS が決めるので、
 * ここは「どの府県か」だけを伝える。一覧のカードと詳細ページの見出しで共通。
 */
export default function PrefBand({ 都道府県, label }: { 都道府県: string; label?: string }) {
  return (
    <div className="pref-band">
      <span className="pref-band__dot" />
      <span className="pref-band__pref">{都道府県}</span>
      <span className="pref-band__romaji">{prefRomaji(都道府県)}</span>
      {label && <span className="pref-band__label">{label}</span>}
    </div>
  )
}
