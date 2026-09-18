import { Link } from 'react-router-dom'

/**
 * どのルートにも当たらなかったURL。
 *
 * GitHub Pages はビルド後の index.html を 404.html にコピーして配信するので
 * （deploy.yml）、存在しないパスはサーバーで止まらず全部このSPAに流れ込む。
 * 受け皿が無いとヘッダーとフッターだけの空白ページになり、
 * 「無い」のか「壊れている」のかが利用者に分からない。
 */
export default function NotFoundPage() {
  return (
    <div className="notfound">
      <p className="notfound__code">404</p>
      <h1 className="notfound__title">ページが見つかりません</h1>
      <p className="notfound__lead">
        URLが変わったか、入力に誤りがある可能性があります。以下から探し直してください。
      </p>
      <div className="notfound__actions">
        <Link to="/concert" className="btn btn--primary">
          コンサートホール一覧
        </Link>
        <Link to="/practice" className="btn btn--ghost">
          練習場一覧
        </Link>
      </div>
    </div>
  )
}
