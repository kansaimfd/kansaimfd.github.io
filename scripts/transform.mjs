/**
 * YAML（正規化・人間が編集）→ JSON（非正規化・UIが消費）の変換そのもの。
 *
 * 読み書きを伴わない純粋な変換だけを置く。ファイル入出力と検査の呼び出しは
 * scripts/build-data.mjs 側にある（検査を validate.mjs に分けているのと同じ理由で、
 * 変換の規則だけを単体で確かめられるようにするため）。
 */

/** 不動産の表示に関する公正競争規約: 道路距離80mにつき徒歩1分、端数切り上げ */
export const METERS_PER_MINUTE = 80

/**
 * 駅距離（道路距離・m）しか分からない施設のために徒歩分数を補完する。
 * 補完は 距離→徒歩 の一方向のみ。逆方向（徒歩→距離）は切り上げのぶん偽の精度になり、
 * かつ消費者がいないため行わない。
 */
export function fillWalkMinutes(stations) {
  if (!Array.isArray(stations)) return stations
  return stations.map(s => {
    if (s.駅徒歩 != null || s.駅距離 == null) return s
    return { ...s, 駅徒歩: Math.ceil(s.駅距離 / METERS_PER_MINUTE), 駅徒歩推定: true }
  })
}

/** 出典[].確認日 の最新値を 最終確認日 として持たせる（YAMLには書かない派生値） */
export function withLastVerified(facility) {
  const dates = facility.出典?.map(s => s.確認日).filter(Boolean) ?? []
  return dates.length > 0
    ? { ...facility, 最終確認日: dates.reduce((a, b) => (a > b ? a : b)) }
    : facility
}

/**
 * 部屋が音楽に使えることを示す手掛かり。どれか一つでもあれば掲載する。
 *
 * **boolean は true のときだけ手掛かりになる。** 「楽器演奏は不可」と書かれた調理室に
 * `管楽器: false` を記録すると、それを手掛かりに音楽室として載ってしまう。
 * 否定の記録がそのまま掲載理由になるのはおかしいので、false は無視する。
 */
const MUSIC_BOOLEANS = [
  'ピアノ有無',
  '譜面台貸出',
  '管楽器',
  '打楽器',
  'パイプオルガン',
  'チェンバロ',
]
const MUSIC_VALUES = ['楽器制限', '客席数', '舞台幅', '舞台奥行', 'ホール種別']

/** 設備が未調査でも、名前から音楽用と分かる部屋 */
const MUSIC_ROOM_NAME = /ホール|練習|リハーサル|音楽|スタジオ|サロン|レッスン|楽器|録音|舞台|多目的/

/**
 * 「ホール」を含んでも演奏には使わない部屋。展示・受付に貸す広間や、ホールの控室など。
 * 名前だけでは音楽用と言えない（音楽設備が書かれていれば、それを根拠に残す）。
 */
const NON_MUSIC_HALL = /エントランスホール|展示ホール|レセプションホール|控室/

/**
 * 会議室・和室・調理室のような、音楽の練習にも演奏会にも使えない部屋を落とす。
 *
 * 施設まるごとを再調査した結果、市民会館・区民センターの類は
 * 陶工芸室や料理教室まで含めて全室が入ってくる。**YAMLには調査した事実として残す**が、
 * 音楽施設のディレクトリとしてはノイズなので、ここでJSONに出さない。
 *
 * 判定はあくまで「落としてよいと言い切れるか」で、迷ったら残す側に倒している
 * （ピアノが1台でもあれば会議室でも残る。設備が未調査の練習室も名前で残る）。
 */
export function isMusicRoom(room) {
  if (MUSIC_BOOLEANS.some(k => room[k] === true)) return true
  if (MUSIC_VALUES.some(k => room[k] !== undefined)) return true
  const name = room.部屋名 ?? ''
  return MUSIC_ROOM_NAME.test(name) && !NON_MUSIC_HALL.test(name)
}

export function normalize(facility) {
  const withStations = facility.最寄駅
    ? { ...facility, 最寄駅: fillWalkMinutes(facility.最寄駅) }
    : facility
  const withRooms = withStations.部屋
    ? { ...withStations, 部屋: withStations.部屋.filter(isMusicRoom) }
    : withStations
  return withLastVerified(withRooms)
}

/**
 * 平坦化した一覧には載せないフィールド。
 *
 * 平坦化は施設の属性をホールの数だけ複製するので、一覧が読まない大きなフィールドが
 * そのまま件数倍になる。`出典` は施設あたり最大5KBあり、これだけで平坦化後のJSONの
 * 8割を占めていた。**出典を捨てているわけではない**。詳細ページは施設単位の
 * concerthallFacilities.json から読むので、そちらには従来どおり残る。
 *
 * `最終確認日` は `出典[].確認日` の派生値で、出典と並べて詳細ページが出すもの。
 * 出典なしで確認日だけ見せても裏が取れないため、一緒に落とす。
 */
const DETAIL_ONLY_FIELDS = ['出典', '最終確認日']

/**
 * 施設 × ホール に平坦化する。
 * 部屋が未登録の施設も一覧から消えないよう、空の部屋を1つ補う。
 */
export function flattenHalls(facilities) {
  return facilities.flatMap(facility => {
    const { 部屋, ...rest } = facility
    for (const key of DETAIL_ONLY_FIELDS) delete rest[key]
    const rooms = 部屋?.length ? 部屋 : [{}]
    return rooms.map((room, i) => ({
      ...rest,
      ...room,
      キー: `${facility.ID}-${room.部屋名 ?? i}`,
    }))
  })
}
