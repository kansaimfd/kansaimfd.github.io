interface Props {
  /** 英字の小見出し 例: HALLS */
  label: string
  title: string
  /** 見出しの後ろに添える件数など */
  note?: string
}

/** 詳細ページの節の見出し。絞り込みパネルの行見出しと同じ「英字＋明朝」の組み合わせ */
export default function SectionHead({ label, title, note }: Props) {
  return (
    <div className="section-head">
      <p className="section-head__label">{label}</p>
      <h2 className="section-head__title">
        {title}
        {note && <span className="section-head__note">{note}</span>}
      </h2>
    </div>
  )
}
