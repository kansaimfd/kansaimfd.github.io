/**
 * dist の検品の、**判断だけを集めたもの**。読み書きと preview の起動は
 * check-dist.mjs が持つ。
 *
 * このリポジトリは検査の中身と入出力を分けてある（validate.mjs / build-data.mjs、
 * static-pages.mjs / build-static-pages.mjs、url-audit.mjs / audit-urls.mjs）。
 * **dist の検品だけがその形になっていなかった**——203行の判断が dist の実物と
 * vite preview の起動に絡まっていて、単体では動かせなかった。
 *
 * 結果として、**「止めるべきものを止められるか」を誰も確かめていない**状態だった。
 * ここは配る直前の最後の門で、通れば Pages に上がる。判断が1つ壊れても、
 * 成功の行だけ出して素通りする（検査の失敗は赤くなるが、検査しそこねは静か）。
 *
 * どの関数も**誤りの文言の配列**を返す。空なら異常なし。
 */
import { pageTitle, SITE_URL } from './static-pages.mjs'

const kb = bytes => `${(bytes / 1024).toFixed(1)}KB`

/** index.html が直接読んでいる js と css のパス（入口の大きさを測る対象） */
export function entryAssetPaths(indexHtml) {
  return [...indexHtml.matchAll(/(?:src|href)="\/(assets\/[^"]+)"/g)].map(m => m[1])
}

/**
 * 入口の大きさ。**一覧のJSONを静的 import に戻すと約20KB増える**ので、
 * そこへ戻る前に止まる余裕を上限にしてある（→ check-dist.mjs の ENTRY_BUDGET）。
 *
 * `assets` は `{ path, bytes }` の配列で、`bytes` は gzip 後。
 */
export function checkEntrySize(assets, budget) {
  if (assets.length === 0) return ['dist/index.html が assets を1つも読んでいません']
  const total = assets.reduce((sum, a) => sum + a.bytes, 0)
  if (total <= budget) return []
  const breakdown = assets.map(a => `${a.path} ${kb(a.bytes)}`).join(' / ')
  return [
    `入口が大きくなっています: gzip ${kb(total)} > 上限 ${kb(budget)}（${breakdown}）\n` +
      `    静的 import が増えていないか確かめてください（一覧も詳細も遅延読み込みです）`,
  ]
}

/** 「大阪府」→「大阪」。説明文の名乗りは府県の接尾辞を付けずに並べている */
const shortPref = name => name.replace(/[府県]$/, '')

/**
 * 説明文が名乗る府県と、実際に載っている府県が合っているか。
 * **足したときも外したときも気づく**（6府県を名乗りながら和歌山県の施設が
 * 1件も無い、という状態が続いていた。→ static-pages.mjs の DESCRIBED_PREFS）。
 */
export function checkDescribedPrefs(facilityPrefs, described) {
  const actual = [...new Set(facilityPrefs.map(shortPref))]
  const 不足 = actual.filter(p => !described.includes(p))
  const 余分 = described.filter(p => !actual.includes(p))
  if (不足.length === 0 && 余分.length === 0) return []
  return [
    `説明文の府県がデータと合っていません（static-pages.mjs の DESCRIBED_PREFS）` +
      `${不足.length ? `\n    載っているのに名乗っていない: ${不足.join('・')}` : ''}` +
      `${余分.length ? `\n    名乗っているのに1件も無い: ${余分.join('・')}` : ''}`,
  ]
}

/** dev サーバーだけが読む index.html の控えが、ビルドの差し替えと食い違わないように */
export function checkIndexDescription(indexHtml, expected) {
  const 控え = indexHtml.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1]
  if (控え === expected) return []
  return [`index.html の description が SITE_DESCRIPTION と違います:\n    ${控え}\n    ${expected}`]
}

/**
 * 404.html。配信側が返すものなので preview には出てこず、ファイルとして確かめる。
 * `html` が空文字なら「無い」とみなす。
 */
export function checkNotFound(html) {
  if (!html) return ['dist/404.html がありません']
  const errors = []
  if (!/<meta name="robots" content="noindex"/.test(html)) {
    errors.push('404.html に noindex がありません（無いページが検索結果に出ます）')
  }
  if (/rel="canonical"/.test(html)) {
    errors.push('404.html に canonical があります（無いページがトップの複製に見えます）')
  }
  return errors
}

const titleOf = html => html.match(/<title>([^<]*)<\/title>/)?.[1]
const canonicalOf = html => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]

/**
 * 配られた1ページ。**題名と canonical が施設ごとに違うことを見る**
 * （全ページが同じ index.html に戻っていれば、ここで揃って落ちる）。
 *
 * 200 以外はその時点で打ち切る。中身を見ても、届いていない理由は分からない。
 */
export function checkPage(page, status, html) {
  if (status !== 200) {
    return [`${page.path} が ${status} で返りました（静的HTMLが届いていません）`]
  }
  const errors = []
  const expected = pageTitle(page.name)
  if (titleOf(html) !== expected) {
    errors.push(`${page.path} の題名が違います: ${titleOf(html)} ≠ ${expected}`)
  }
  const canonical = SITE_URL + (page.canonical ?? page.path)
  if (canonicalOf(html) !== canonical) {
    errors.push(`${page.path} の canonical が違います: ${canonicalOf(html)} ≠ ${canonical}`)
  }
  // 施設ページは noscript に施設名が出る（JS を実行しない相手に見える唯一の本文）
  if (page.fallback && !html.includes(`<h1>${page.fallback.heading}</h1>`)) {
    errors.push(`${page.path} の noscript に施設名がありません`)
  }
  return errors
}

/** sitemap も配られていること（robots.txt が指している先）。届かなければ0件として落ちる */
export function checkSitemap(xml, expected) {
  const listed = [...xml.matchAll(/<loc>/g)].length
  return listed === expected ? [] : [`sitemap.xml の件数が違います: ${listed} ≠ ${expected}`]
}
