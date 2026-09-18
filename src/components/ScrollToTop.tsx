import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ページ遷移で先頭に戻す。
 *
 * ブラウザの既定のスクロール復元は文書の読み込みに紐づいていて、SPAの
 * 画面切り替えでは働かない。一覧を下までスクロールしてから詳細へ入ると、
 * 詳細ページが途中から表示されて見出しが画面外にある状態になっていた。
 *
 * **見るのは pathname だけ**で、クエリ文字列の変化では動かさない。
 * 絞り込みはクエリに載るので、条件を変えるたびに先頭へ飛ばされると
 * 結果を見ながら条件を詰められなくなる。
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
