interface Props {
  count: number
  /** 未調査による除外を起こした項目名（→ filter.ts の unknownFields） */
  fields: string[]
}

/**
 * 未調査のせいで絞り込みから外れた件数を伝える。
 *
 * **「公式に記載なし」も同じく外れる**（記載が無いのは「無い」とは限らない）。
 * 一覧用のJSONはどちらなのかを持たないので、文言は両方を含めて「分からない」と言う。
 * どちらなのかは詳細ページの部屋ごとの欄で分かる。
 *
 * **黙って消すと、実際には条件に合う施設を利用者が見落とす。**
 * 掲載しているデータは項目ごとに埋まり具合がまちまちで、たとえば客席数は
 * 一覧のホールの1割ほどに入っていない。客席数で絞ればそれらは外れるが、それは
 * 「客席数が条件に合わない」ではなく「調べていない」だけの施設を含む。
 *
 * 一覧ごとに書き分けると、片方だけ文言が古くなるので共通にしてある。
 */
export default function UnknownNotice({ count, fields }: Props) {
  if (count === 0) return null

  return (
    <div className="notice notice--warn" role="status">
      <span aria-hidden>⚠</span>
      <span>
        {fields.join('・')}が<strong>分からない</strong>（未調査、または公式に記載なし） {count}{' '}
        件を絞り込みから除外しています。条件に合わないと確認できたわけではないため、
        実際には条件に合う施設が含まれている可能性があります。
      </span>
    </div>
  )
}
