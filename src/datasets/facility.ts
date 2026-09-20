import type { ConcertHallFacility, Practice } from '../types'

/**
 * 詳細ページの施設データを、1施設につき1ファイルで読む。
 *
 * 全施設をまとめた1つのJSONを静的に import していたころ、`/concert/10` を
 * 直接開いた利用者は、1施設を見るために全施設ぶん（当時 gzip 171KB）を落としていた。
 * 詳細ページの直リンクは外部からの入口そのものなので、ここが一番重かった。
 *
 * `import.meta.glob` はビルド時にファイルを数え上げるだけで、実際の読み込みは
 * 呼ばれたときの動的 import になる。**ファイル名は詳細ページのURLに使うIDと同じ**
 * （build-data.mjs が src/data/concert/<ID>.json として書き出す）。
 */
const CONCERT_FILES = import.meta.glob<{ default: ConcertHallFacility }>('../data/concert/*.json')
const PRACTICE_FILES = import.meta.glob<{ default: Practice }>('../data/practice/*.json')

/**
 * 知らないIDでは **null を同期で返す**。IDは外部からのリンクに使われるので、
 * 落とさず「見つかりません」の案内に回す。
 *
 * 解決済みのPromiseで包まずに同期で返すのは、ファイルの一覧がビルド時に
 * 決まっていて、無いことはその場で分かるため。待つ理由が無いのに待たせると、
 * 知らないIDでも一度「読み込んでいます」が出てから案内に変わる。
 *
 * テストから呼べるよう、ファイルの表を引数に取る形にしてある。
 */
export function createLoader<T>(files: Record<string, () => Promise<{ default: T }>>, dir: string) {
  /**
   * 読み込み中のPromiseを施設ごとに覚えておく入れ物。
   *
   * **use() に渡すPromiseは、同じ施設なら毎回同じものでなければならない。**
   * 描画のたびに新しいPromiseを作ると、解決しても次の描画でまた別のPromiseを
   * 待つことになり、いつまでも読み込み中のままになる。
   * ついでに、一度見た施設へ戻ったときは待ち時間なしで出る。
   */
  const cache = new Map<string, Promise<T>>()

  return (id: number): Promise<T> | null => {
    const path = `../data/${dir}/${id}.json`
    const hit = cache.get(path)
    if (hit) return hit

    const load = files[path]
    if (!load) return null

    /**
     * **失敗したPromiseは覚えない。**
     * 覚えたままにすると、通信が一度でも途切れた施設は再訪しても同じ
     * 失敗を待ち続け、ページを再読み込みするまで二度と開けなくなる。
     * 取り除いておけば、戻ってもう一度開いたときに読み直せる。
     */
    const pending = load().then(
      m => m.default,
      err => {
        cache.delete(path)
        throw err
      },
    )
    cache.set(path, pending)
    return pending
  }
}

export const concertHallFacility = createLoader(CONCERT_FILES, 'concert')
export const practiceFacility = createLoader(PRACTICE_FILES, 'practice')
