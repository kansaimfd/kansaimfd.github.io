/**
 * 検索エンジン・SNS向けに、ページごとの <head> を持った静的HTMLを組み立てる。
 *
 * このサイトは SPA で、どのURLにも同じ index.html が返る。そのままだと
 * - 167施設の詳細ページがすべて同じ題名・説明になり、SNSに貼っても施設名が出ない
 * - GitHub Pages では直リンクが 404.html のフォールバックで表示されるため
 *   **HTTPステータスが404のまま**で、検索エンジンには「無いページ」として扱われる
 *
 * ビルド後に `dist/concert/10.html` のようなファイルをURLの数だけ書き出すと、
 * 静的配信のまま 200 で返り、題名・説明・構造化データも施設ごとに付く。
 * 中身（<body>）は index.html のままで、表示はこれまでどおりアプリが描く。
 *
 * ここは文字列の組み立てだけ。読み書きは build-static-pages.mjs が持つ。
 */
import { isHallRoom } from './transform.mjs'

/** 配信先のURL（末尾のスラッシュなし）。canonical・OGP・sitemap の絶対URLに使う */
export const SITE_URL = 'https://kansaimfd.github.io'

/** src/title.ts の SITE_NAME と同じ値（テストで一致を確かめている） */
export const SITE_NAME = '関西音楽施設ディレクトリ'

/** src/title.ts の pageTitle と同じ規則 */
export function pageTitle(name) {
  const trimmed = name?.trim()
  return trimmed ? `${trimmed} | ${SITE_NAME}` : SITE_NAME
}

export const SITE_DESCRIPTION =
  '関西（大阪・京都・兵庫・奈良・滋賀・和歌山）のコンサートホールと音楽練習場を、客席数・舞台寸法・設備・最寄駅から探せる非公式のディレクトリです。'

/** 一覧などの、施設に紐付かないページ */
const FIXED_PAGES = [
  { path: '/concert', name: 'コンサートホール一覧', description: SITE_DESCRIPTION },
  {
    path: '/practice',
    name: '練習場一覧',
    description:
      '関西の音楽練習場を、定員・面積・ピアノや管打楽器の可否・最寄駅から探せます。コンサートホールに併設された練習室・リハーサル室も含みます。',
  },
  {
    path: '/about',
    name: 'このサイトについて',
    description: '関西音楽施設ディレクトリの概要・利用規約・出典・免責事項。',
  },
]

const escapeHtml = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** <script> の中に置く JSON。`</script>` で閉じられないよう < を逃がす */
const scriptJson = value => JSON.stringify(value).replace(/</g, '\\u003c')

/** 「近鉄郡山駅から徒歩7分」。バス停は鉄道駅と誤解されないよう明記する（src/station.ts と同じ扱い） */
function accessText(stations) {
  const s = stations?.[0]
  if (!s) return undefined
  // 名前が既にバス停と言っているものには重ねない
  const name = s.種別 === 'バス停' && !/(バス停|停留所)$/.test(s.駅) ? `${s.駅}（バス停）` : s.駅
  return s.駅徒歩 != null ? `${name}から徒歩${s.駅徒歩}分` : `最寄りは${name}`
}

/** 貸館を止めている施設は、説明の先頭でそう言う（検索結果だけ見て借りに行かないように） */
function rentalPrefix(f) {
  switch (f.貸館?.状態) {
    case '終了':
      return '貸館を終了した施設です。'
    case '廃止':
      return '現在は存在しない施設です。'
    case '休止':
      return '貸館を休止中の施設です。'
    default:
      return ''
  }
}

function hallSummary(f) {
  const halls = (f.部屋 ?? []).filter(isHallRoom)
  const parts = halls
    .filter(r => r.客席数 != null)
    .map(r => (r.部屋名 ? `${r.部屋名} ${r.客席数}席` : `${r.客席数}席`))
  return parts.length > 0 ? parts.join('・') : undefined
}

function roomSummary(f) {
  const rooms = f.部屋 ?? []
  if (rooms.length === 0) return undefined
  const piano = rooms.some(r => r.ピアノ有無 === true) ? '（ピアノのある部屋あり）' : ''
  return `音楽に使える部屋 ${rooms.length}室${piano}`
}

export function concertDescription(f) {
  const detail = [hallSummary(f), accessText(f.最寄駅)].filter(Boolean).join('。')
  return `${rentalPrefix(f)}${f.施設名}（${f.都道府県}${f.市区町村}）のホール情報。${detail ? `${detail}。` : ''}客席数・舞台寸法・ピアノなどの設備を掲載しています。`
}

export function practiceDescription(f) {
  const detail = [roomSummary(f), accessText(f.最寄駅)].filter(Boolean).join('。')
  return `${rentalPrefix(f)}${f.施設名}（${f.都道府県}${f.市区町村}）の音楽練習場の情報。${detail ? `${detail}。` : ''}定員・面積・楽器の可否などを掲載しています。`
}

/**
 * 施設の構造化データ（schema.org）。コンサートホールは MusicVenue、練習場は Place。
 * 練習室を表す型は schema.org に無く、MusicVenue（演奏会場）と名乗るのは実態と違うため
 */
export function facilityJsonLd(f, kind, url) {
  const capacities = (f.部屋 ?? []).map(r => r.客席数).filter(n => n != null)
  return {
    '@context': 'https://schema.org',
    '@type': kind === 'concert' ? 'MusicVenue' : 'Place',
    name: f.施設名,
    url,
    ...(f.URL && { sameAs: f.URL }),
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'JP',
      addressRegion: f.都道府県,
      addressLocality: f.市区町村,
      streetAddress: f.番地以下,
    },
    geo: { '@type': 'GeoCoordinates', latitude: f.緯度, longitude: f.経度 },
    ...(f.TEL && { telephone: f.TEL }),
    ...(capacities.length > 0 && { maximumAttendeeCapacity: Math.max(...capacities) }),
  }
}

/**
 * 書き出すページの一覧。
 *
 * 練習場一覧に並ぶ「ホール併設」の練習室は詳細が /concert/:id にあるので、
 * 練習場側のページは practice.yaml の施設ぶんだけ作る
 */
export function buildPages({ concert, practice }) {
  const detail = (kind, f, description) => {
    const path = `/${kind}/${f.ID}`
    return {
      path,
      name: f.施設名,
      description,
      jsonLd: facilityJsonLd(f, kind, SITE_URL + path),
      lastmod: f.最終確認日,
    }
  }
  return [
    { path: '/', name: undefined, description: SITE_DESCRIPTION },
    ...FIXED_PAGES,
    ...concert.map(f => detail('concert', f, concertDescription(f))),
    ...practice.map(f => detail('practice', f, practiceDescription(f))),
  ]
}

/**
 * index.html の <head> をページ用に差し替える。
 *
 * 題名と説明は置き換え、canonical・OGP・構造化データは </head> の直前に足す。
 * index.html 側に題名・説明が無ければ気づけるよう例外にする（黙って素通りすると
 * 全ページが同じ題名に戻っても分からない）
 */
export function renderPage(template, page) {
  const title = pageTitle(page.name)
  const url = SITE_URL + page.path
  const titleRe = /<title>[^<]*<\/title>/
  const descRe = /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/
  if (!titleRe.test(template) || !descRe.test(template)) {
    throw new Error('index.html に <title> か <meta name="description"> が見つかりません')
  }
  const head = [
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:locale" content="ja_JP" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    ...(page.jsonLd
      ? [`<script type="application/ld+json">${scriptJson(page.jsonLd)}</script>`]
      : []),
  ]
    .map(line => `    ${line}\n`)
    .join('')
  return template
    .replace(titleRe, () => `<title>${escapeHtml(title)}</title>`)
    .replace(descRe, () => `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/[ \t]*<\/head>/, end => `${head}${end}`)
}

/**
 * 存在しないURLに返す 404.html。canonical を付けない
 * （index.html を写すと canonical がトップを指し、無いページがトップの複製に見える）
 */
export function renderNotFound(template) {
  return template.replace(/<head>/, () => '<head>\n    <meta name="robots" content="noindex" />')
}

/** sitemap.xml。lastmod は出典の最終確認日（施設ページのみ。一覧は日付を持たない） */
export function buildSitemap(pages) {
  const urls = pages
    .map(p => {
      const lastmod = p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''
      return `  <url><loc>${escapeHtml(SITE_URL + p.path)}</loc>${lastmod}</url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

const LIST_PATHS = ['/concert', '/practice']

/**
 * ページのパスから書き出すファイル名。
 *
 * `/concert/10` → `concert/10.html`。GitHub Pages・Cloudflare Pages・vite preview は
 * どれも拡張子を省いたURLに .html を当てて返す。
 * 一覧（`/concert`）は同名のディレクトリ（`concert/`）と並ぶので、配信側の解決順が
 * 「ファイル → ディレクトリ」でも「ディレクトリ → ファイル」でも200で返るよう、
 * `concert.html` と `concert/index.html` の両方に書く
 */
export function outputFiles(path) {
  if (path === '/') return ['index.html']
  const name = path.slice(1)
  return LIST_PATHS.includes(path) ? [`${name}.html`, `${name}/index.html`] : [`${name}.html`]
}
