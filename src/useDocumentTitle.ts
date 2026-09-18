import { useEffect } from 'react'
import { pageTitle } from './title'

/**
 * ページ名を document.title に反映する。
 *
 * SPAなので何もしないと全ページが index.html の題名のままになる。
 * 施設の詳細ページは167あり、タブを並べて見比べる・ブックマークする・
 * 履歴から戻る、のどれもが「関西音楽施設ディレクトリ」の区別で潰れていた。
 *
 * **早期 return より前で呼ぶこと。** 施設が見つからない場合も含めて
 * 条件分岐の外に置かないと、フックの呼び出し順が崩れる。
 */
export default function useDocumentTitle(name?: string | null): void {
  useEffect(() => {
    document.title = pageTitle(name)
  }, [name])
}
