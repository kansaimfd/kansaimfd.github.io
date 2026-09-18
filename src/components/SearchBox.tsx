interface Props {
  value: string
  onChange: (value: string) => void
}

/** 一覧のフリーワード検索。**コンサートホールと練習場で同じものを使う** */
export default function SearchBox({ value, onChange }: Props) {
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
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="フリーワード検索"
        aria-label="フリーワード検索"
      />
    </div>
  )
}
