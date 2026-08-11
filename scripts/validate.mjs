/**
 * 施設データの検査。すべてオフラインで完結する検査のみを置く。
 *
 * 外部APIに依存する検査（住所からの座標検算）は scripts/audit-coordinates.mjs に分離してある。
 * 毎回のビルドで外部サービスを叩かないため。
 *
 * エラーは1件目で止めずに全件集めてから報告する。1つ直すたびにビルドし直すのを避けるため。
 */

/** 府県ごとの概略範囲 [南, 北, 西, 東]。厳密な境界ではなく、桁違いの誤りを捕まえるためのもの */
const PREF_BOX = {
  大阪府:   [34.27, 35.05, 135.09, 135.75],
  京都府:   [34.70, 35.78, 134.85, 136.06],
  兵庫県:   [34.15, 35.68, 134.25, 135.47],
  奈良県:   [33.85, 34.78, 135.55, 136.15],
  滋賀県:   [34.79, 35.70, 135.75, 136.45],
  和歌山県: [33.43, 34.33, 135.00, 136.02],
}

const REQUIRED = ['施設名', '都道府県', '市区町村', '番地以下', '経度', '緯度']
const URL_FIELDS = ['URL', '申込URL', '料金URL']
const AVAILABILITY_FIELDS = ['ピアノ有無', 'パイプオルガン', '譜面台貸出', '親子室', '管楽器', '打楽器']
const PIANO_TYPES = ['グランド', 'アップライト', '電子']
const HALL_TYPES = ['音楽専用', '多目的', '小ホール・サロン']
const SEIREI_CITIES = ['大阪市', '神戸市', '京都市', '堺市']
const TIME_FIELDS = ['開館時間', '閉館時間']

/** 徒歩でこれを超えるなら、実際はバス利用などの可能性が高い */
const WALK_MINUTES_LIMIT = 30

/**
 * 路線名の表記ゆれを見つけるための正規化。
 * 「大阪メトロ御堂筋線」と「Osaka Metro御堂筋線」を同一視して、
 * 表記が割れていることに気づけるようにする。
 */
function normalizeLine(name) {
  return name
    .replace(/\s+/g, '')
    .replace(/^(Osaka ?Metro|大阪メトロ|大阪市営地下鉄|地下鉄|地下)/i, 'OsakaMetro')
    .replace(/^(神戸市営地下鉄|神戸地下鉄)/, '神戸市営地下鉄')
    .replace(/^(京都市営地下鉄|京都地下鉄)/, '京都市営地下鉄')
    .replace(/^(JR西日本|ＪＲ|JR)/, 'JR')
    .replace(/^(阪急電鉄|阪急電車|阪急)/, '阪急')
    .replace(/^(阪神電鉄|阪神電車|阪神)/, '阪神')
    .replace(/^(近畿日本鉄道|近鉄)/, '近鉄')
    .replace(/^(南海電鉄|南海電気鉄道|南海)/, '南海')
    .replace(/^(京阪電鉄|京阪電車|京阪)/, '京阪')
    .toLowerCase()
}

const isHttpUrl = v => typeof v === 'string' && /^https?:\/\/\S+$/.test(v)
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isTime = v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
const isPositive = v => typeof v === 'number' && Number.isFinite(v) && v > 0

export function validate(datasets) {
  const errors = []
  /** 警告は種類ごとに集計する。同種が何十件も並ぶと対処すべきものが埋もれるため */
  const warnings = []
  /** 路線名: 正規化後 → 実際に使われている表記の集合 */
  const lineVariants = new Map()

  for (const { file, records } of datasets) {
    const seenIds = new Map()

    for (const f of records) {
      const at = `[${file} ID:${f.ID}] ${f.施設名 ?? '(施設名なし)'}`
      const err = msg => errors.push(`${at} ${msg}`)
      const warn = (kind, detail) => warnings.push({ kind, detail: `${at} ${detail ?? ''}`.trim() })

      // ── ID ──
      if (typeof f.ID !== 'number' || !Number.isInteger(f.ID)) {
        err(`ID が整数ではありません: ${JSON.stringify(f.ID)}`)
      } else if (seenIds.has(f.ID)) {
        err(`ID が重複しています（${seenIds.get(f.ID)} と同じ）`)
      } else {
        seenIds.set(f.ID, f.施設名)
      }

      // ── 必須フィールド ──
      for (const k of REQUIRED) if (f[k] == null || f[k] === '') err(`${k} がありません`)
      if (REQUIRED.some(k => f[k] == null)) continue

      // ── 座標 ──
      if (typeof f.緯度 !== 'number' || typeof f.経度 !== 'number') {
        err(`座標が数値ではありません: ${f.緯度}, ${f.経度}`)
      } else {
        const box = PREF_BOX[f.都道府県]
        if (!box) {
          err(`都道府県が関西6府県ではありません: ${f.都道府県}`)
        } else if (f.緯度 < box[0] || f.緯度 > box[1] || f.経度 < box[2] || f.経度 > box[3]) {
          err(`座標が ${f.都道府県} の概略範囲外です: ${f.緯度}, ${f.経度}`)
        }
      }

      // ── 住所 ──
      if (/[０-９]/.test(f.番地以下)) err(`番地以下に全角数字があります: ${f.番地以下}`)
      if (/[−－]/.test(f.番地以下)) err(`番地以下に全角ハイフンがあります: ${f.番地以下}`)
      if (f.番地以下.includes(f.都道府県) || f.番地以下.includes(f.市区町村)) {
        err(`番地以下に都道府県・市区町村が重複しています: ${f.番地以下}`)
      }
      // 「大阪市西区」に対する「西区立売堀…」のように、区・町・村名だけが重複するケース
      const ward = f.市区町村.match(/[^市区町村郡]+[区町村]$/)?.[0]
      if (ward && f.番地以下.startsWith(ward)) {
        err(`番地以下の先頭に ${ward} が重複しています: ${f.番地以下}`)
      }
      if (SEIREI_CITIES.includes(f.市区町村)) err(`政令市は区まで書いてください: ${f.市区町村}`)
      if (/[町村]$/.test(f.市区町村) && !/[市郡]/.test(f.市区町村)) {
        err(`郡部は郡名から書いてください: ${f.市区町村}`)
      }
      // ビル名・階数が番地側にあるとジオコーディングでの座標検算が効かない
      if (/(ビル|階|[0-9]+F|B[0-9]+F)/i.test(f.番地以下)) {
        err(`建物名は 建物 フィールドに分けてください: ${f.番地以下}`)
      }

      // ── 施設名かな ──
      // 漢字を含む名前は読みが機械的に決まらないため、五十音順ソートに 施設名かな が要る
      if (f.施設名かな != null) {
        if (!/^[ぁ-ゖー・]+$/.test(f.施設名かな)) {
          err(`施設名かな はひらがなで書いてください: ${f.施設名かな}`)
        }
      } else if (/[一-鿿]/.test(f.施設名)) {
        warn('施設名かなが未設定（五十音順に並ばない）')
      }

      // ── URL ──
      for (const k of URL_FIELDS) {
        if (f[k] != null && !isHttpUrl(f[k])) err(`${k} がURLの形式ではありません: ${f[k]}`)
      }

      // ── 時刻 ──
      for (const k of TIME_FIELDS) {
        if (f[k] != null && !isTime(f[k])) err(`${k} は "HH:MM" 形式で書いてください: ${JSON.stringify(f[k])}`)
      }
      if (f.開館時間 && f.閉館時間 && f.開館時間 >= f.閉館時間) {
        warn('開館時間が閉館時間以降', `${f.開館時間} 〜 ${f.閉館時間}`)
      }

      // ── 設備の3値 ──
      checkAvailability(f, at, err)

      // ── 部屋 ──
      if (f.部屋 != null) {
        if (!Array.isArray(f.部屋)) err(`部屋 は配列で書いてください`)
        else {
          for (const [i, room] of f.部屋.entries()) {
            for (const k of ['客席数', '面積', '定員', '舞台幅', '舞台奥行', '譜面台数', '楽屋収容人数']) {
              if (room[k] != null && !isPositive(room[k])) {
                err(`部屋[${i}] の ${k} が正の数ではありません: ${JSON.stringify(room[k])}`)
              }
            }
            if (room.ピアノ種別 != null && !PIANO_TYPES.includes(room.ピアノ種別)) {
              err(`部屋[${i}] の ピアノ種別 は ${PIANO_TYPES.join(' / ')} のいずれかです: ${room.ピアノ種別}`)
            }
            // 「有無 ＋ 詳細」の形なので、詳細だけあって有無が立っていないのは矛盾
            if ((room.ピアノ種別 != null || room.ピアノメーカー != null) && room.ピアノ有無 !== true) {
              err(`部屋[${i}] にピアノの詳細があるのに ピアノ有無 が true ではありません`)
            }
            if (room.譜面台数 != null && room.譜面台貸出 === false) {
              err(`部屋[${i}] に 譜面台数 があるのに 譜面台貸出 が false です`)
            }
            if (room.ホール種別 != null && !HALL_TYPES.includes(room.ホール種別)) {
              err(`部屋[${i}] の ホール種別 は ${HALL_TYPES.join(' / ')} のいずれかです: ${room.ホール種別}`)
            }
            if (room.オルガン製作者 != null && room.パイプオルガン !== true) {
              err(`部屋[${i}] に オルガン製作者 があるのに パイプオルガン が true ではありません`)
            }
            if (room.楽器制限 != null && typeof room.楽器制限 !== 'string') {
              err(`部屋[${i}] の 楽器制限 は文字列で書いてください`)
            }
          }
          const unnamed = f.部屋.filter(r => !r.部屋名).length
          if (f.部屋.length > 1 && unnamed > 0) {
            err(`部屋が複数あるのに部屋名のないものが ${unnamed} 件あります（区別できません）`)
          }
        }
      } else {
        warn('部屋が未登録')
      }

      // ── 最寄駅 ──
      for (const [i, s] of (f.最寄駅 ?? []).entries()) {
        const where = `最寄駅[${i}]`
        if (!s.駅) { err(`${where} に 駅 がありません`); continue }
        if (!/(駅|停留場|バス停|港|IC)$/.test(s.駅)) {
          warn('駅名の語尾が不自然', `${where} ${s.駅}`)
        }
        if (s.路線 != null && !Array.isArray(s.路線)) {
          err(`${where} の 路線 は配列で書いてください: ${JSON.stringify(s.路線)}`)
        }
        for (const line of Array.isArray(s.路線) ? s.路線 : []) {
          const key = normalizeLine(line)
          if (!lineVariants.has(key)) lineVariants.set(key, new Set())
          lineVariants.get(key).add(line)
        }
        for (const k of ['駅徒歩', '駅距離']) {
          if (s[k] != null && !isPositive(s[k])) {
            err(`${where} の ${k} が正の数ではありません: ${JSON.stringify(s[k])}`)
          }
        }
        if (s.駅徒歩 != null && s.駅距離 != null) {
          // 公正競争規約は道路距離80m=徒歩1分・切り上げ。1分ぶんの余裕を見て矛盾を判定する
          const expected = Math.ceil(s.駅距離 / 80)
          if (Math.abs(s.駅徒歩 - expected) > 1) {
            warn('駅徒歩と駅距離が食い違う', `${where} 駅徒歩${s.駅徒歩}分 / 駅距離${s.駅距離}m→約${expected}分`)
          }
        }
        if (s.駅徒歩 != null && s.駅徒歩 > WALK_MINUTES_LIMIT) {
          warn('駅徒歩が長すぎる（バス利用の疑い）', `${where} ${s.駅} 徒歩${s.駅徒歩}分`)
        }
      }

      // ── 出典 ──
      if (f.出典 == null) {
        warn('出典が未記録')
      } else if (!Array.isArray(f.出典)) {
        err(`出典 は配列で書いてください`)
      } else {
        for (const [i, s] of f.出典.entries()) {
          if (!isHttpUrl(s.URL)) err(`出典[${i}] の URL がURLの形式ではありません: ${s.URL}`)
          if (!isDate(s.確認日)) err(`出典[${i}] の 確認日 は YYYY-MM-DD で書いてください: ${JSON.stringify(s.確認日)}`)
          if (s.項目 != null && !Array.isArray(s.項目)) err(`出典[${i}] の 項目 は配列で書いてください`)
        }
      }
    }
  }

  // ── 路線名の表記ゆれ（全ファイル横断）──
  for (const [, variants] of lineVariants) {
    if (variants.size > 1) {
      warnings.push({ kind: '路線名の表記ゆれ', detail: [...variants].join(' / ') })
    }
  }

  return { errors, warnings }
}

/** 〇/× が残っていないか。false と「未調査」を混同しないための検査 */
function checkAvailability(obj, at, err, path = '') {
  if (Array.isArray(obj)) return obj.forEach((v, i) => checkAvailability(v, at, err, `${path}[${i}]`))
  if (obj == null || typeof obj !== 'object') return
  for (const [k, v] of Object.entries(obj)) {
    if (AVAILABILITY_FIELDS.includes(k) && v != null && typeof v !== 'boolean') {
      err(`${path}.${k} が boolean ではありません: ${JSON.stringify(v)}（〇→true / ×→false、未調査はキーごと省略）`)
    }
    checkAvailability(v, at, err, path ? `${path}.${k}` : k)
  }
}

/** 全件を並べずに要約する件数のしきい値 */
const SUMMARY_THRESHOLD = 5

/**
 * 検査結果を出力し、エラーがあれば true を返す。
 * 警告は種類ごとにまとめる。「出典が未記録」のような同種の警告が百件並ぶと、
 * 対処すべき警告が埋もれてしまうため。
 */
export function report({ errors, warnings }, { verbose = false } = {}) {
  if (warnings.length > 0) {
    const byKind = new Map()
    for (const w of warnings) {
      if (!byKind.has(w.kind)) byKind.set(w.kind, [])
      byKind.get(w.kind).push(w.detail)
    }
    console.warn(`\n⚠ 警告 ${warnings.length}件`)
    for (const [kind, details] of [...byKind].sort((a, b) => a[1].length - b[1].length)) {
      console.warn(`  ${kind}: ${details.length}件`)
      const shown = verbose || details.length <= SUMMARY_THRESHOLD ? details : details.slice(0, 3)
      for (const d of shown) console.warn(`    ${d}`)
      if (shown.length < details.length) {
        console.warn(`    …ほか ${details.length - shown.length}件（全件は --verbose）`)
      }
    }
  }
  if (errors.length > 0) {
    console.error(`\n✖ エラー ${errors.length}件`)
    for (const e of errors) console.error(`  ${e}`)
  }
  return errors.length > 0
}
