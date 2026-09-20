import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ページ遷移で先頭に戻し、フォーカスも本文へ移す。
 *
 * ブラウザの既定のスクロール復元は文書の読み込みに紐づいていて、SPAの
 * 画面切り替えでは働かない。一覧を下までスクロールしてから詳細へ入ると、
 * 詳細ページが途中から表示されて見出しが画面外にある状態になっていた。
 *
 * **スクロールだけでは足りない。** 画面の中身が入れ替わってもフォーカスは
 * 押したリンクの位置に残るので、読み上げは新しいページの存在に気づかず、
 * Tab の続きも前のページの位置から始まる。本文の入れ物へフォーカスを移すと、
 * 読み上げが新しいページの先頭から読み直し、Tab もそこから続く。
 *
 * **最初の表示では動かさない。** 読み込み直後にフォーカスを奪うと、
 * ブラウザが復元するスクロール位置やページ内リンク（`#main`）の飛び先を上書きしてしまう。
 * 直前の pathname を覚えて比べるので、StrictMode が効果を二重に実行しても1回しか動かない。
 *
 * **見るのは pathname だけ**で、クエリ文字列の変化では動かさない。
 * 絞り込みはクエリに載るので、条件を変えるたびに先頭へ飛ばされると
 * 結果を見ながら条件を詰められなくなる（フォーカスも入力欄から外れてしまう）。
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()
  const prev = useRef<string | null>(null)

  useEffect(() => {
    const moved = prev.current !== null && prev.current !== pathname
    prev.current = pathname
    if (!moved) return

    window.scrollTo(0, 0)
    // tabIndex={-1} はマークアップ側（App.tsx）で付けてある。
    // preventScroll は、上で先頭へ戻したのを focus が巻き戻さないため
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])

  return null
}
