import type { ReactNode } from 'react'
import EmptyResult from './EmptyResult'

interface Props {
  /** 読み上げ用の説明。表が何の一覧なのかは見出しを辿らないと分からない */
  caption: string
  /** 列の数。0件の行をぶち抜くのに要る */
  columns: number
  /** `<tr>` ごと渡す見出しの行 */
  head: ReactNode
  count: number
  onReset?: () => void
  children: ReactNode
}

/** 表表示の枠。列と行は一覧ごとに違うが、枠・読み上げ用の説明・0件の表示は共通 */
export default function DataTable({ caption, columns, head, count, onReset, children }: Props) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>{head}</thead>
        <tbody>
          {children}
          {count === 0 && (
            <tr>
              <td colSpan={columns}>
                <EmptyResult onReset={onReset} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
