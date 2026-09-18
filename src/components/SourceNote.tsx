import type { Source } from '../types'

interface Props {
  出典?: Source[]
  最終確認日?: string
}

/**
 * 情報の出所と確認日。
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
    <div className="source-note">
      <p>
        情報の確認日: {最終確認日 ?? '—'}
        <span className="source-note__meta">時点</span>
      </p>
      <ul className="source-note__list">
        {出典.map((s, i) => (
          <li key={i}>
            <a href={s.URL} target="_blank" rel="noopener noreferrer" className="source-note__link">
              {s.URL}
            </a>
            <span className="source-note__meta">（{s.確認日}）</span>
            {s.項目 && s.項目.length > 0 && (
              <span className="source-note__meta">— {s.項目.join('・')}</span>
            )}
            {s.備考 && <span className="source-note__remark">{s.備考}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
