import type { Source } from '../types'

interface Props {
  出典?: Source[]
  最終確認日?: string
}

/**
 * 情報の確認日。詳細ページの先頭、一覧へ戻るリンクの行に小さく出す。
 *
 * 出典のURL・備考は画面には出さない（データには残してあり、裏取りの記録として使う）。
 * 出典が無い場合は「未記録」であることを明示する。黙って何も出さないと、
 * 裏の取れていない情報が検証済みに見えてしまうため。
 */
export default function SourceNote({ 出典, 最終確認日 }: Props) {
  if (!出典 || 出典.length === 0) {
    return (
      <p className="source-note">
        <span className="source-note__missing">出典・確認日は未記録です。</span>{' '}
        掲載内容の裏が取れていないため、利用前に公式サイトでご確認ください。
      </p>
    )
  }

  return (
    <p className="source-note">
      情報の確認日: {最終確認日 ?? '—'}
      <span className="source-note__meta">時点</span>
    </p>
  )
}
