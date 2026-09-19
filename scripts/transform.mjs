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

/**
 * 「ホール」と名が付いても、客席を組んで演奏会を開く部屋ではないもの。
 * 平土間の宴会場・展示場・会議場で、定員と面積しか書かれていない。
 */
const NOT_CONCERT_HALL = /レセプション|展示|エントランス|コンベンション|交流|セミナー|控室/

/**
 * コンサートホール一覧に載せる部屋か。**載せない部屋は練習場一覧に回す**（toHallPracticeList）。
 *
 * コンサートホール施設は練習室・リハーサル室・スタジオを併設しているのが普通で、
 * それらをホールと並べると、一覧の半分以上が客席数も舞台も無い部屋になっていた。
 * 探している人にとっては練習場なので、そちらに出す。
 *
 * ホールと言えるのは、客席・舞台・パイプオルガン・ホール種別のどれかが書かれているか、
 * 名前が「◯◯ホール」のもの（設備が未調査の小ホールも残す）。
 * **部屋名の無い部屋はホール扱い**にする。単一ホールの施設は部屋名を省略してよい決まりのため。
 */
export function isHallRoom(room) {
  if (['客席数', 'ホール種別', '舞台幅', '舞台奥行'].some(k => room[k] !== undefined)) return true
  if (room.パイプオルガン === true) return true
  const name = room.部屋名
  if (name == null) return true
  return /ホール/.test(name) && !NOT_CONCERT_HALL.test(name)
}

/**
 * 出典[].記載なし に書ける項目。**「公式を確かめたが、値を確定できる記載が無かった」**の記録。
 *
 * 設備の3値は未調査をキーの省略で表すが、施設のサイトは「無いもの」をまず書かないので、
 * 調べても値が埋まらない項目が多い（ピアノ有無は記入のほぼ全部が true）。
 * 省略のままだと「調べていない」と「調べたが書いていなかった」が区別できず、
 * どこを調べに行けばよいのかも、利用者に何と説明すべきかも分からない。
 *
 * **記載なしは「なし（false）」ではない。** 絞り込みでは未調査と同じく「判断できない」に数える。
 */
export const NOT_STATED_FACILITY_FIELDS = [
  'TEL',
  '開館時間',
  '閉館時間',
  '休館日',
  '駐車場',
  '築年月',
]
export const NOT_STATED_ROOM_FIELDS = [
  'ホール種別',
  '客席数',
  '面積',
  '定員',
  '楽屋収容人数',
  '舞台幅',
  '舞台奥行',
  '管楽器',
  '打楽器',
  'ピアノ有無',
  'ピアノ種別',
  'ピアノメーカー',
  'チェンバロ',
  'パイプオルガン',
  'オルガン製作者',
  '譜面台貸出',
  '譜面台数',
  '親子室',
]

/** 施設の出典すべての 記載なし を合わせたもの（どのページで確かめたかは問わない） */
export function notStatedFields(facility) {
  const names = (facility.出典 ?? []).flatMap(s => (Array.isArray(s.記載なし) ? s.記載なし : []))
  return new Set(names)
}

/**
 * 出典[].記載なし を、施設と部屋の `記載なし`（値が無い項目だけ）に配る。
 *
 * **値のある項目には付けない。** 別のページや別の部屋で値が分かっていれば、そちらが正しい。
 * 出典は施設単位なので、部屋の項目は値の無い部屋すべてに付く
 * （公式の部屋一覧を確かめて書いていなかった、という記録のため）。
 */
export function withNotStated(facility) {
  const names = notStatedFields(facility)
  if (names.size === 0) return facility
  const own = NOT_STATED_FACILITY_FIELDS.filter(k => names.has(k) && facility[k] == null)
  const rooms = facility.部屋?.map(room => {
    const missing = NOT_STATED_ROOM_FIELDS.filter(k => names.has(k) && room[k] == null)
    return missing.length > 0 ? { ...room, 記載なし: missing } : room
  })
  return {
    ...facility,
    ...(own.length > 0 && { 記載なし: own }),
    ...(rooms && { 部屋: rooms }),
  }
}

export function normalize(facility) {
  // 検査除外 はデータ検査のための記録で、画面では使わない
  const rest = { ...facility }
  delete rest.検査除外
  const withStations = rest.最寄駅 ? { ...rest, 最寄駅: fillWalkMinutes(rest.最寄駅) } : rest
  const withRooms = withStations.部屋
    ? { ...withStations, 部屋: withStations.部屋.filter(isMusicRoom) }
    : withStations
  return withLastVerified(withNotStated(withRooms))
}

/**
 * 平坦化した一覧に**載せる**フィールド。
 *
 * 平坦化は施設の属性をホールの数だけ複製するので、一覧が読まないフィールドが
 * そのまま件数倍になる（複数ホールの施設はその数だけ行が増える）。`出典` は施設あたり最大5KBあり、
 * これだけで平坦化後のJSONの8割を占めていた。
 *
 * **落とすものではなく載せるものを挙げる。** 除外リストで書いていたころ、
 * 一覧が読まない 料金URL・申込URL・休館日・TEL などが漏れて43KB残っていた。
 * スキーマにフィールドを足すたび除外を書き足すのは忘れるが、
 * こちらの形なら「一覧で使う」と決めたときにしか増えない。
 *
 * **捨てているわけではない**。詳細ページは施設単位の
 * concerthallFacilities.json を読むので、そちらには全フィールドが残る。
 * 対応する型は types.ts の ConcertHall（ここを変えたらあちらも変える）。
 */
const LIST_FACILITY_FIELDS = [
  'ID',
  '施設名',
  '施設名かな', // 五十音順の並び替えに要る
  '都道府県',
  '市区町村',
  '番地以下',
  '建物',
  '最寄駅',
  'URL', // カードの「公式サイト」
  '貸館',
  '利用条件',
  '駐車場', // 「駐車場あり」の絞り込みとバッジ
  '経度',
  '緯度',
]

/**
 * 同じく、部屋から一覧に載せるフィールド。
 *
 * `貸館` が施設側と部屋側の両方にあるのは、部屋ごとに休止・終了が分かれる施設が
 * あるため（あましんアルカイックホールは大ホール休止・中ホール営業・小ホール終了）。
 * 下の平坦化で部屋の値があとに来るので、部屋側が施設側を上書きする。
 */
const LIST_ROOM_FIELDS = [
  '部屋名',
  'ホール種別',
  '客席数',
  '舞台幅',
  '舞台奥行',
  'ピアノ有無',
  'パイプオルガン',
  '譜面台貸出',
  '親子室',
  '貸館',
]

/**
 * 練習場の一覧に載せるフィールド。考え方はコンサートホールと同じで、
 * 一覧が読むものだけを挙げる。
 *
 * 練習場は平坦化しない（1施設1行）が、詳細ページと同じJSONを一覧にも配っていたので
 * 出典・TEL・休館日・申込URLといった詳細ページ専用の値まで全員に届いていた。
 */
const LIST_PRACTICE_FIELDS = [
  'ID',
  '施設名',
  '施設名かな',
  '都道府県',
  '市区町村',
  '番地以下',
  '建物',
  '最寄駅',
  'URL',
  '貸館',
  '利用条件',
  '駐車場',
  '経度',
  '緯度',
  'ピアノ有無', // 施設レベルの貸出備品。部屋側と合わせて3値を出す
]

/**
 * 同じく、部屋から一覧に載せるフィールド。
 *
 * 部屋名を載せていないのは、一覧が部屋を「最大の定員・面積」と「設備の3値」に
 * 畳んでしか使わないため。部屋ごとの表は詳細ページにある。
 */
const LIST_PRACTICE_ROOM_FIELDS = ['定員', '面積', 'ピアノ有無', '管楽器', '打楽器', 'チェンバロ']

/** 指定したキーのうち、値を持つものだけを写す */
function pick(source, fields) {
  const out = {}
  for (const key of fields) {
    if (source[key] !== undefined) out[key] = source[key]
  }
  return out
}

/**
 * 施設 × ホール に平坦化する。ホールでない部屋（isHallRoom）は載せない。
 * 部屋が未登録の施設も一覧から消えないよう、空の部屋を1つ補う。
 */
export function flattenHalls(facilities) {
  return facilities.flatMap(facility => {
    const rest = pick(facility, LIST_FACILITY_FIELDS)
    const halls = facility.部屋?.filter(isHallRoom) ?? []
    const rooms = halls.length ? halls : [{}]
    return rooms.map((room, i) => ({
      ...rest,
      ...pick(room, LIST_ROOM_FIELDS),
      キー: `${facility.ID}-${room.部屋名 ?? i}`,
    }))
  })
}

/**
 * 練習場を一覧用に絞る。部屋は一覧が読む項目だけに畳む。
 *
 * 一覧と詳細で同じJSONを配っていたころ、練習場しか見ない利用者にも
 * 出典（施設あたり最大5KB）が全件ぶん届いていた。
 */
export function toPracticeList(facilities) {
  return facilities.map(facility => {
    const item = pick(facility, LIST_PRACTICE_FIELDS)
    if (facility.部屋) item.部屋 = facility.部屋.map(room => pick(room, LIST_PRACTICE_ROOM_FIELDS))
    return item
  })
}

/** 借りられる度合いの順。複数の部屋の状態を1つにまとめるときに、いちばん借りやすいものを採る */
const RENTAL_ORDER = ['予定', '休止', '終了', '廃止']

/**
 * 施設としての貸館の状態。施設側に書かれていればそれ、
 * 無ければ**全室が休止・終了しているときだけ**、いちばん借りやすい部屋の状態を採る
 * （1室でも通常どおり貸していれば、施設としては借りられる）。
 */
function rentalOf(facility, rooms) {
  if (facility.貸館) return facility.貸館
  if (rooms.some(r => !r.貸館)) return undefined
  return rooms
    .map(r => r.貸館)
    .reduce((a, b) => (RENTAL_ORDER.indexOf(a.状態) <= RENTAL_ORDER.indexOf(b.状態) ? a : b))
}

/**
 * コンサートホール施設の、ホールでない部屋（練習室・リハーサル室・スタジオなど）を
 * 練習場一覧の形にする。部屋が無い施設は出さない。
 *
 * **詳細ページはコンサートホール側（/concert/:id）を使う**ので `ホール併設: true` を付ける。
 * IDの名前空間はファイルごとに別なので、練習場の同じIDの施設とは区別が要る。
 */
export function toHallPracticeList(facilities) {
  return facilities.flatMap(facility => {
    const rooms = facility.部屋?.filter(r => !isHallRoom(r)) ?? []
    if (rooms.length === 0) return []
    const item = pick(facility, LIST_PRACTICE_FIELDS)
    const 貸館 = rentalOf(facility, rooms)
    if (貸館) item.貸館 = 貸館
    else delete item.貸館
    item.部屋 = rooms.map(room => pick(room, LIST_PRACTICE_ROOM_FIELDS))
    item.ホール併設 = true
    return [item]
  })
}
