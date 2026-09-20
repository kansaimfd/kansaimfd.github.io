/**
 * 調査カバレッジ。**「どの項目がどれだけ埋まっているか」を数える。**
 *
 * データ検査（validate.mjs）が見るのは「書かれている値が正しいか」で、
 * **書かれていないことは何も言わない**。設備の3値では未調査をキーの省略で表すので、
 * 黙っていると「調べていない」と「無い」の区別が数の上では見えないままになる。
 *
 * 利用者から見ると、未調査の多い項目はそのまま**使えない絞り込み**になる。
 * ホール種別が3割しか埋まっていなければ、種別で絞った人は残り7割を見ずに判断している
 * （画面には「未調査のため除外しました」と出るが、どの項目が薄いのかはここでしか分からない）。
 *
 * 読み書きを伴わないので単体でテストできる（coverage.test.mjs）。
 */

/** 施設ごとに1回数える項目 */
const FACILITY_FIELDS = ['最寄駅', 'URL', '駐車場', '開館時間', 'TEL', '出典']

/** 部屋ごとに数える項目。一覧の絞り込みに効くものを選ぶ */
const ROOM_FIELDS = {
  concerthall: [
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
  practice: ['定員', '面積', 'ピアノ有無', '管楽器', '打楽器', 'チェンバロ', '譜面台貸出'],
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
 * 1ファイルぶんの項目別カバレッジ。
 * 施設単位と部屋単位で母数が違うので、行に単位を持たせる。
 *
 * **部屋の母数には、掲載される部屋だけを渡すこと**（`rooms`）。
 * YAMLには会議室・和室のように音楽に使えない部屋も残してあり（調査した事実として残す）、
 * それを母数に混ぜると「ホール種別 19%」のように実態より薄く見える。
 * 利用者が見るのは掲載される部屋だけなので、そちらで数えるのが実態に合う。
 */
export function fieldCoverage({ file, records, rooms = records.flatMap(r => r.部屋 ?? []) }) {
  const rows = [
    ...FACILITY_FIELDS.map(名前 => {
      const 記入 = records.filter(r => filled(r[名前])).length
      return { 名前, 単位: '施設', 記入, 母数: records.length, 割合: ratio(記入, records.length) }
    }),
    ...(ROOM_FIELDS[file] ?? []).map(名前 => {
      const 記入 = rooms.filter(r => filled(r[名前])).length
      return { 名前, 単位: '部屋', 記入, 母数: rooms.length, 割合: ratio(記入, rooms.length) }
    }),
  ]
  return { file, 施設数: records.length, 部屋数: rooms.length, rows }
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

/** 埋まっていない順に並べた、手を入れる価値のある項目 */
export function thinnest(coverages, limit = 3) {
  return coverages
    .flatMap(c => c.rows.map(r => ({ ...r, file: c.file })))
    .filter(r => r.母数 > 0)
    .sort((a, b) => a.割合 - b.割合)
    .slice(0, limit)
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
      .map(r => `${r.名前} ${r.割合}%`)
      .join('・')
    console.log(
      `調査: 出典なし ${f.未記録}件 / 1年以上前の確認 ${古い}件 / ` +
        `薄い項目 ${薄い}（項目別は --coverage）`,
    )
    return
  }

  for (const c of coverages) {
    console.log(`\n■ ${c.file}（施設 ${c.施設数} / 部屋 ${c.部屋数}）`)
    for (const r of c.rows) {
      const 目盛り = '█'.repeat(Math.round(r.割合 / 5)).padEnd(20, '·')
      console.log(
        `  ${padLabel(r.名前)} ${r.単位} ${目盛り} ` +
          `${String(r.割合).padStart(3)}%  ${r.記入}/${r.母数}`,
      )
    }
  }
  console.log(
    `\n■ 確認日の鮮度（${all.length}施設）\n` +
      `  1年以内 ${f['1年以内']} / 1〜2年 ${f['1〜2年']} / ` +
      `2年以上 ${f['2年以上']} / 未記録 ${f.未記録}`,
  )
}
