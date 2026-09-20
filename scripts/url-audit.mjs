/**
 * 登録URLの中身を見て「別サイトに変わっていないか」を判定する部分。
 *
 * **読み書きと通信を持たないので単体でテストできる。** 外部アクセスそのものは
 * audit-urls.mjs が持つ（鮮度検査が選び出しを coverage.mjs の staleRecords に
 * 出しているのと同じ分け方）。
 *
 * ここが決めているのは月次の Issue に何を並べるかで、閾値を動かせば
 * 見逃しにも誤検知にも振れる。スクリプトの中に閉じていると、
 * 167施設へ実際に通信してみるまで挙動を確かめられなかった。
 */

const SCRIPT_OR_STYLE = /<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi
const TAG = /<[^>]*>/g
const URL_IN_TEXT = /https?:\/\/[^\s"'<>]+/g

/**
 * 施設名がページに出てくるかを、2文字の連なり（bigram）の一致率で測る。
 *
 * 完全一致で見ると誤検知だらけになる。「RHY梅田」が「アール・エイチ・ワイ」、
 * 「Poco四条」が「POCO四条」のように、同じ施設でも表記が揺れるため。
 */
export function nameHitRatio(name, text) {
  // 記号と空白を落として比べる。括弧を外すのは**施設名の側だけ**——
  // ページ側から外すと「平野区民センター（コミュニティプラザ平野）」のように
  // 括弧の中にこそ登録名が入っている場合に、照合相手を自分で消してしまう
  const norm = s =>
    s
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\s・,.'"’”「」-]/g, '')
  const n = norm(name.replace(/[（(].*?[)）]/g, '')),
    t = norm(text)
  const grams = new Set()
  for (let i = 0; i + 2 <= n.length; i++) grams.add(n.slice(i, i + 2))
  if (!grams.size) return 1
  let hit = 0
  for (const g of grams) if (t.includes(g)) hit++
  return hit / grams.size
}

/** `<title>` の中身。長いものは先頭だけ（Issue に並べるため） */
export function titleOf(body) {
  return (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/**
 * 照合に使う可視テキスト。**ホスト名とURLは除く。**
 * 失効ドメインを取得した転用サイトは、施設名入りのホスト名（sayaka-hall.jp）を
 * タイトルや本文のURLに出すので、URLごと数えると「施設名が出てくる」ことになってしまう。
 */
export function visibleText(body, title, host) {
  return (title + ' ' + body)
    .replace(SCRIPT_OR_STYLE, ' ')
    .replace(TAG, ' ')
    .split(new RegExp(host.replace(/\./g, '\\.'), 'gi'))
    .join(' ')
    .replace(URL_IN_TEXT, ' ')
}

/**
 * 「開くが別サイト」の閾値。
 *
 * 施設名の一致率がこれを下回れば疑う。英語ページ（en-US）はさらに厳しく見る——
 * 日本の施設の公式サイトが英語だけで出来ていることはまずなく、
 * 失効ドメインの転用先は英語のテンプレートサイトであることが多いため。
 */
const SUSPECT_RATIO = 0.34
const EN_SUSPECT_RATIO = 0.7

/** ページが英語で書かれていると自ら言っているか */
export function isEnglishPage(body) {
  return /inLanguage":"en-US"|<html[^>]+lang="en(-US)?"/.test(body)
}

/**
 * 開いたページが登録された施設のものか。
 * `suspect` が true なら「別サイトの疑い」として Issue に並べる。
 */
export function judgePage({ 施設名, URL: url, body }) {
  const title = titleOf(body)
  const host = new globalThis.URL(url).hostname
  const ratio = nameHitRatio(施設名, visibleText(body, title, host))
  const enUS = isEnglishPage(body)
  const suspect = ratio < SUSPECT_RATIO || (enUS && ratio < EN_SUSPECT_RATIO)
  return {
    suspect,
    title,
    ratio,
    why: `施設名の一致率 ${(ratio * 100).toFixed(0)}%${enUS ? '・en-US' : ''}`,
  }
}

/**
 * Content-Type や meta charset を見て本文をデコードする（Shift_JIS のサイトが残っている）。
 * 判別できない・扱えない符号化は UTF-8 として読む（文字化けはしても検査は続く）。
 */
export function decodeBody(buffer, contentType) {
  const hint = (contentType || '') + ' ' + buffer.subarray(0, 2048).toString('latin1')
  let enc = (hint.match(/charset=["']?([\w-]+)/i)?.[1] || 'utf-8').toLowerCase()
  if (['sjis', 'x-sjis', 'windows-31j', 'ms932'].includes(enc)) enc = 'shift_jis'
  try {
    return new TextDecoder(enc).decode(buffer)
  } catch {
    return buffer.toString('utf8')
  }
}
