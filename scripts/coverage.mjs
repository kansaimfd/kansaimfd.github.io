/**
 * 調査カバレッジ。**「どの項目がどれだけ埋まっているか」を数える。**
 *
 * データ検査（validate.mjs）が見るのは「書かれている値が正しいか」で、
 * **書かれていないことは何も言わない**。設備の3値では未調査をキーの省略で表すので、
 * 黙っていると「調べていない」と「無い」の区別が数の上では見えないままになる。
 *
 * 利用者から見ると、未調査の多い項目はそのまま**使えない絞り込み**になる。
 * 練習室の管楽器が3割しか埋まっていなければ、管楽器で絞った人は残り7割を見ずに判断している
 * （画面には「分からないため除外しました」と出るが、どの項目が薄いのかはここでしか分からない）。
 *
 * **空欄は「未調査」と「公式に記載なし」に分けて数える**（出典[].記載なし）。
 * 施設のサイトは無いものを書かないので、調べても埋まらない空欄が多い。
 * 分けないと、調べに行くべき項目と、調べ直しても埋まらない項目の区別がつかない。
 *
 * 読み書きを伴わないので単体でテストできる（coverage.test.mjs）。
 */

import { isHallRoom } from './transform.mjs'

/** 施設ごとに1回数える項目 */
const FACILITY_FIELDS = ['最寄駅', 'URL', '駐車場', '開館時間', 'TEL', '出典']

const PRACTICE_ROOM_FIELDS = ['定員', '面積', 'ピアノ有無', '管楽器', '打楽器', '譜面台貸出']

/**
 * 部屋ごとに数える項目。一覧の絞り込みに効くものを選ぶ。
 *
 * **コンサートホール施設の部屋は、ホールと併設の練習室に分けて数える。**
 * 一覧に出るのもそのとおりで（練習室は練習場一覧へ回る）、練習室に客席数や舞台幅を
 * 問うても埋まらない。まとめて数えていたころは、一覧のホールでは 88% 埋まっている
 * 客席数が 44% と出ていた。
 */
const ROOM_GROUPS = {
  concerthall: [
    {
      単位: 'ホール',
      pick: isHallRoom,
      fields: [
        'ホール種別',
        '客席数',
        '舞台幅',
        '舞台奥行',
        '楽屋収容人数',
        'ピアノ有無',
        'パイプオルガン',
        '譜面台貸出',
        '親子室',
      ],
    },
    { 単位: '併設練習室', pick: room => !isHallRoom(room), fields: PRACTICE_ROOM_FIELDS },
  ],
  practice: [{ 単位: '部屋', pick: () => true, fields: [...PRACTICE_ROOM_FIELDS, 'チェンバロ'] }],
}

/** 空配列は「調べたが無い」ではなく未記入として数える（最寄駅・出典） */
const filled = value => value != null && (!Array.isArray(value) || value.length > 0)

const ratio = (n, total) => (total === 0 ? 0 : Math.round((n / total) * 100))

/**
 * 全角を2桁、半角を1桁として数えた表示幅。
 * `padEnd` は文字数で詰めるので、`最寄駅` と `URL` が同じ列に揃わない。
 */
const displayWidth = name =>
  [...name].reduce((n, ch) => n + (/[\u0020-\u007e\uff61-\uff9f]/.test(ch) ? 1 : 2), 0)

/** 項目名を表示幅で揃える。半角1桁ぶんの端数は半角空白で埋める */
export function padLabel(name, width = 16) {
  const 不足 = Math.max(0, width - displayWidth(name))
  return name + '　'.repeat(Math.floor(不足 / 2)) + ' '.repeat(不足 % 2)
}

/**
 * 1項目ぶん。値のあるもの（記入）、公式に記載が無かったもの（記載なし）、
 * どちらでもないもの（未調査）に分ける。**手を入れるべきは未調査**で、記載なしは
 * 公式を読み直しても埋まらない。
 */
function countRow(名前, 単位, items) {
  const 記入 = items.filter(x => filled(x[名前])).length
  const 記載なし = items.filter(x => !filled(x[名前]) && x.記載なし?.includes(名前)).length
  const 母数 = items.length
  const 未調査 = 母数 - 記入 - 記載なし
  return {
    名前,
    単位,
    記入,
    記載なし,
    未調査,
    母数,
    割合: ratio(記入, 母数),
    未調査割合: ratio(未調査, 母数),
  }
}

/**
 * 1ファイルぶんの項目別カバレッジ。施設単位と部屋単位で母数が違うので、行に単位を持たせる。
 *
 * **`records` には変換後（normalize 後）の施設を渡すこと。**
 * 部屋は掲載される部屋だけになり（会議室・和室を母数に混ぜると実態より薄く見える）、
 * 出典の記載なしが施設と部屋の `記載なし` に配られている。
 */
export function fieldCoverage({ file, records }) {
  const groups = (ROOM_GROUPS[file] ?? []).map(g => ({
    ...g,
    rooms: records.flatMap(r => (r.部屋 ?? []).filter(g.pick)),
  }))
  const rows = [
    ...FACILITY_FIELDS.map(名前 => countRow(名前, '施設', records)),
    ...groups.flatMap(g => g.fields.map(名前 => countRow(名前, g.単位, g.rooms))),
  ]
  return {
    file,
    施設数: records.length,
    部屋数: Object.fromEntries(groups.map(g => [g.単位, g.rooms.length])),
    rows,
  }
}

/** 出典のうち最も新しい確認日。1件も無ければ undefined */
export function lastCheckedOn(record) {
  const dates = (record.出典 ?? []).map(s => s.確認日).filter(Boolean)
  return dates.length > 0 ? dates.sort().at(-1) : undefined
}

/**
 * 確認日の鮮度。**古い情報は誤りより気づきにくい。**
 * 休館・移転・料金改定は告知なく起きるので、確認から間が空いた施設は
 * 「正しく見えるが実際とは違う」状態になりうる。
 */
export function freshness(records, today = new Date()) {
  const 境界 = years => {
    const d = new Date(today)
    d.setFullYear(d.getFullYear() - years)
    return d.toISOString().slice(0, 10)
  }
  const 一年前 = 境界(1)
  const 二年前 = 境界(2)

  const counts = { 未記録: 0, '1年以内': 0, '1〜2年': 0, '2年以上': 0 }
  for (const r of records) {
    const 確認日 = lastCheckedOn(r)
    if (!確認日) counts.未記録 += 1
    else if (確認日 >= 一年前) counts['1年以内'] += 1
    else if (確認日 >= 二年前) counts['1〜2年'] += 1
    else counts['2年以上'] += 1
  }
  return counts
}

/**
 * 確認から間が空いた施設を、古い順に並べて返す。
 *
 * `freshness()` が件数を数えるのに対し、こちらは**どの施設か**を返す。
 * 月次の見直し（audit-freshness.mjs）が Issue に並べるために使う。
 * 出典が無い施設は「確認日が古い」とは別の問題なので分けて返す。
 */
export function staleRecords(datasets, { today = new Date(), months = 12 } = {}) {
  const 境界 = new Date(today)
  境界.setMonth(境界.getMonth() - months)
  const 期限 = 境界.toISOString().slice(0, 10)

  const stale = []
  const missing = []
  let total = 0
  for (const { file, records } of datasets) {
    for (const r of records) {
      total += 1
      const 確認日 = lastCheckedOn(r)
      if (!確認日) missing.push({ file, ID: r.ID, 施設名: r.施設名, URL: r.URL })
      else if (確認日 < 期限) stale.push({ file, ID: r.ID, 施設名: r.施設名, URL: r.URL, 確認日 })
    }
  }
  // 古いものから直したいので、確認日の昇順に並べる
  stale.sort((a, b) => (a.確認日 < b.確認日 ? -1 : a.確認日 > b.確認日 ? 1 : 0))
  return { stale, missing, total, 期限 }
}

/** 未調査の多い順に並べた、手を入れる価値のある項目（記載なしは調べても埋まらないので数えない） */
export function thinnest(coverages, limit = 3) {
  return coverages
    .flatMap(c => c.rows.map(r => ({ ...r, file: c.file })))
    .filter(r => r.母数 > 0)
    .sort((a, b) => b.未調査割合 - a.未調査割合)
    .slice(0, limit)
}

/** 20目盛りの帯。█ 記入 / ▒ 記載なし / · 未調査 */
function bar(r) {
  const n = x => (r.母数 === 0 ? 0 : Math.round((x / r.母数) * 20))
  const 記入 = n(r.記入)
  const 記載なし = Math.min(n(r.記入 + r.記載なし) - 記入, 20 - 記入)
  return '█'.repeat(記入) + '▒'.repeat(記載なし) + '·'.repeat(20 - 記入 - 記載なし)
}

/**
 * 出力。**既定では1行に畳む。** `npm run dev` のたびに表が流れると、
 * ビルドの結果そのものが読みにくくなる。詳細は `--coverage` で出す。
 */
export function reportCoverage(datasets, { detailed = false, today = new Date() } = {}) {
  const coverages = datasets.map(fieldCoverage)
  const all = datasets.flatMap(d => d.records)
  const f = freshness(all, today)
  const 古い = f['1〜2年'] + f['2年以上']

  if (!detailed) {
    const 薄い = thinnest(coverages)
      .map(r => `${r.名前}(${r.単位}) ${r.未調査割合}%`)
      .join('・')
    console.log(
      `調査: 出典なし ${f.未記録}件 / 1年以上前の確認 ${古い}件 / ` +
        `未調査の多い項目 ${薄い}（項目別は --coverage）`,
    )
    return
  }

  for (const c of coverages) {
    const 部屋 = Object.entries(c.部屋数)
      .map(([単位, n]) => ` / ${単位} ${n}`)
      .join('')
    console.log(`
■ ${c.file}（施設 ${c.施設数}${部屋}）  █ 記入 ▒ 公式に記載なし · 未調査`)
    for (const r of c.rows) {
      console.log(
        `  ${padLabel(r.名前, 14)} ${padLabel(r.単位, 10)} ${bar(r)} ` +
          `${String(r.割合).padStart(3)}%  記入 ${r.記入} / 記載なし ${r.記載なし} / ` +
          `未調査 ${r.未調査}（母数 ${r.母数}）`,
      )
    }
  }
  console.log(
    `
■ 確認日の鮮度（${all.length}施設）
` +
      `  1年以内 ${f['1年以内']} / 1〜2年 ${f['1〜2年']} / ` +
      `2年以上 ${f['2年以上']} / 未記録 ${f.未記録}`,
  )
}
