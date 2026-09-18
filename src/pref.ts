/**
 * 府県の並びと英字表記。
 *
 * **色はここに持たない。** 府県ごとのアクセント色は CSS 側（styles/tokens.css）に
 * `[data-pref='京都府']` として置いてあり、要素に `data-pref` を付けるだけで切り替わる。
 * 色を JS に戻すと、カードと絞り込みのピルで別々に持つことになり、また食い違う。
 */
export const ALL_PREFS = ['大阪府', '京都府', '兵庫県', '奈良県', '滋賀県', '和歌山県']

const ROMAJI: Record<string, string> = {
  大阪府: 'OSAKA',
  京都府: 'KYOTO',
  兵庫県: 'HYOGO',
  奈良県: 'NARA',
  滋賀県: 'SHIGA',
  和歌山県: 'WAKAYAMA',
}

/** 帯に添える英字。表にない府県では空（帯そのものは府県名で成立する） */
export function prefRomaji(pref: string): string {
  return ROMAJI[pref] ?? ''
}
