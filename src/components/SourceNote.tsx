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
      <p className="mt-6 text-xs text-gray-500 border-t border-gray-200 pt-3 leading-relaxed">
        <span className="text-amber-700">出典・確認日は未記録です。</span>{' '}
        掲載内容の裏が取れていないため、利用前に公式サイトでご確認ください。
      </p>
    )
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-3 text-xs text-gray-500 leading-relaxed">
      <p>
        <span className="text-gray-600">情報の確認日:</span> {最終確認日 ?? '—'}
        <span className="ml-1 text-gray-400">時点</span>
      </p>
      <ul className="mt-1.5 space-y-1">
        {出典.map((s, i) => (
          <li key={i}>
            <a
              href={s.URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-navy-700 hover:text-gold-500 hover:underline break-all"
            >
              {s.URL}
            </a>
            <span className="text-gray-400 ml-1">（{s.確認日}）</span>
            {s.項目 && s.項目.length > 0 && (
              <span className="text-gray-400 ml-1">— {s.項目.join('・')}</span>
            )}
            {s.備考 && <span className="block text-gray-400">{s.備考}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
