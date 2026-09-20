import { useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
}

/**
 * 一覧のフリーワード検索。**コンサートホールと練習場で同じものを使う**。
 *
 * **変換が確定するまで絞り込みに渡さない。** 検索語はURLが持つので、打鍵のたびに
 * ここを通って戻ってくる（→ useListState）。日本語入力では変換中にも `input` が
 * 発火するため、「ほーる」を打つ途中の `h` `ho` `ho-` …がそのまま検索語になり、
 * **確定するまで0件が点滅していた**（照合側は NFKC とひらがな化で均すが、
 * ローマ字の途中の綴りはどの施設にも当たらない。→ filter.ts の normalize）。
 * ローマ字入力である以上ほぼ全員が踏むので、変換中は値を自分で持ち、
 * `compositionend` で一度だけ親へ渡す。
 *
 * 変換を伴わない入力（英数字・貼り付け・`type="search"` の×）はこれまでどおり
 * 打鍵ごとに渡す。変換中かどうかは `composing` が null かで見分ける。
 */
export default function SearchBox({ value, onChange }: Props) {
  /** 変換中に入力欄へ出す値。変換していないあいだは null（＝親の値をそのまま出す） */
  const [composing, setComposing] = useState<string | null>(null)

  return (
    <div className="search">
      <svg
        className="search__icon"
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <circle cx="5.5" cy="5.5" r="3.5" />
        <path d="M8 8l3 3" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        className="search__input"
        value={composing ?? value}
        onChange={e => {
          const next = e.target.value
          if (composing === null) onChange(next)
          else setComposing(next)
        }}
        // compositionstart は最初の input より先に来るので、ここで変換中に入る
        onCompositionStart={e => setComposing(e.currentTarget.value)}
        onCompositionEnd={e => {
          setComposing(null)
          onChange(e.currentTarget.value)
        }}
        placeholder="フリーワード検索"
        aria-label="フリーワード検索"
      />
    </div>
  )
}
