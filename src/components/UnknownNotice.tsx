interface Props {
  /** 未調査のせいで「合うとも合わないとも言えない」件数（→ filter.ts） */
  count: number
  /** その判断できなさを起こした項目名（→ filter.ts の unknownFields） */
  fields: string[]
  /** いま一覧に含めているか */
  included: boolean
  onToggle: () => void
}

/**
 * 未調査のせいで判断できなかった件数を伝え、**含めるかどうかを選ばせる。**
 *
 * **「公式に記載なし」も同じく判断できない**（記載が無いのは「無い」とは限らない）。
 * 一覧用のJSONはどちらなのかを持たないので、文言は両方を含めて「分からない」と言う。
 * どちらなのかは詳細ページの部屋ごとの欄で分かる。
 *
 * **黙って消すと、実際には条件に合う施設を利用者が見落とす。**
 * 掲載しているデータは項目ごとに埋まり具合がまちまちで、たとえば客席数は
 * 一覧のホールの1割ほどに入っていない。客席数で絞ればそれらは外れるが、それは
 * 「客席数が条件に合わない」ではなく「調べていない」だけの施設を含む。
 *
 * **知らせるだけでは、利用者にできることが「条件を外す」しかなかった。**
 * 未調査を含めれば、条件に合うかもしれない施設を自分で確かめに行ける
 * （公式サイトへのリンクはカードにある）。既定は従来どおり除外のまま——
 * 条件に合うと確かめられた施設が先に見える方が、探す目的には合う。
 *
 * 一覧ごとに書き分けると、片方だけ文言が古くなるので共通にしてある。
 */
export default function UnknownNotice({ count, fields, included, onToggle }: Props) {
  if (count === 0) return null

  return (
    <div className="notice notice--warn" role="status">
      <span aria-hidden>⚠</span>
      <span>
        {fields.join('・')}が<strong>分からない</strong>（未調査、または公式に記載なし） {count}{' '}
        件を
        {included ? (
          <>含めて表示しています。条件に合うかどうかは確かめられていません。</>
        ) : (
          <>
            絞り込みから除外しています。条件に合わないと確認できたわけではないため、
            実際には条件に合う施設が含まれている可能性があります。
          </>
        )}
        <button type="button" className="notice__action" onClick={onToggle}>
          {included ? '未調査を除く' : '未調査も含めて表示'}
        </button>
      </span>
    </div>
  )
}
