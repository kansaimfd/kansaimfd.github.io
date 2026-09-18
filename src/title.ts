/** ブラウザのタブ・履歴・ブックマークに出る名前。index.html の <title> と揃える */
export const SITE_NAME = '関西音楽施設ディレクトリ'

/**
 * 「ページ名 | サイト名」を組み立てる。
 *
 * ページ名が無ければサイト名だけを返す。空文字や空白だけを渡されたときに
 * 「 | 関西音楽施設ディレクトリ」のような、区切りだけが残った題名を作らないため。
 */
export function pageTitle(name?: string | null): string {
  const trimmed = name?.trim()
  return trimmed ? `${trimmed} | ${SITE_NAME}` : SITE_NAME
}
