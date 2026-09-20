/**
 * dist の検品が、**止めるべきものを止められるか**を見る。
 *
 * ここは配る直前の最後の門で、通れば Pages に上がる（deploy.yml）。
 * 判断が1つ壊れても「dist OK」の行だけ出して素通りするので、
 * 正しい dist を通すことと同じだけ、壊れた dist を落とすことを確かめる。
 */
import { describe, expect, it } from 'vitest'
import {
  checkDescribedPrefs,
  checkEntrySize,
  checkIndexDescription,
  checkNotFound,
  checkPage,
  checkSitemap,
  entryAssetPaths,
} from './dist-check.mjs'
import { SITE_URL } from './static-pages.mjs'

describe('entryAssetPaths', () => {
  const html = `<!doctype html><html><head>
    <link rel="stylesheet" href="/assets/index-abc.css" />
    <link rel="icon" href="/favicon.svg" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=X" />
    </head><body><script type="module" src="/assets/index-def.js"></script></body></html>`

  it('index.html が直接読む js と css を拾う', () => {
    expect(entryAssetPaths(html)).toEqual(['assets/index-abc.css', 'assets/index-def.js'])
  })

  it('assets の外（favicon・Webフォント）は数えない', () => {
    expect(entryAssetPaths(html)).not.toContain('favicon.svg')
    expect(entryAssetPaths(html).some(p => p.startsWith('http'))).toBe(false)
  })
})

describe('checkEntrySize', () => {
  const asset = (path, bytes) => ({ path, bytes })

  it('上限の内なら通す', () => {
    expect(checkEntrySize([asset('assets/a.js', 80 * 1024)], 90 * 1024)).toEqual([])
  })

  it('ちょうど上限は通す', () => {
    expect(checkEntrySize([asset('assets/a.js', 90 * 1024)], 90 * 1024)).toEqual([])
  })

  it('入口が上限を超えたら止める', () => {
    const [msg] = checkEntrySize(
      [asset('assets/a.js', 85 * 1024), asset('assets/a.css', 10 * 1024)],
      90 * 1024,
    )
    expect(msg).toMatch('入口が大きくなっています')
    // 何がどれだけ占めているかを出す（増えた原因を探せるように）
    expect(msg).toMatch('assets/a.js 85.0KB')
    expect(msg).toMatch('assets/a.css 10.0KB')
    expect(msg).toMatch('静的 import')
  })

  it('合計で見る（1本ずつは小さくても止まる）', () => {
    const assets = Array.from({ length: 10 }, (_, i) => asset(`assets/${i}.js`, 10 * 1024))
    expect(checkEntrySize(assets, 90 * 1024)).toHaveLength(1)
  })

  it('assets を1つも読んでいなければ止める', () => {
    expect(checkEntrySize([], 90 * 1024)).toEqual([
      'dist/index.html が assets を1つも読んでいません',
    ])
  })
})

describe('checkDescribedPrefs', () => {
  const 実データ = ['大阪府', '大阪府', '京都府', '兵庫県']

  it('名乗りと実データが合っていれば通す', () => {
    expect(checkDescribedPrefs(実データ, ['大阪', '京都', '兵庫'])).toEqual([])
  })

  it('名乗っているのに1件も無い府県があれば止める', () => {
    const [msg] = checkDescribedPrefs(実データ, ['大阪', '京都', '兵庫', '和歌山'])
    expect(msg).toMatch('名乗っているのに1件も無い: 和歌山')
  })

  it('載っているのに名乗っていない府県があれば止める', () => {
    const [msg] = checkDescribedPrefs(実データ, ['大阪', '京都'])
    expect(msg).toMatch('載っているのに名乗っていない: 兵庫')
  })

  it('足りないのと余っているのが同時でも両方出す', () => {
    const [msg] = checkDescribedPrefs(実データ, ['大阪', '京都', '滋賀'])
    expect(msg).toMatch('載っているのに名乗っていない: 兵庫')
    expect(msg).toMatch('名乗っているのに1件も無い: 滋賀')
  })
})

describe('checkIndexDescription', () => {
  const html = content => `<meta name="description" content="${content}" />`

  it('控えと同じなら通す', () => {
    expect(checkIndexDescription(html('関西の…'), '関西の…')).toEqual([])
  })

  it('食い違えば止める（dev サーバーだけが読む控えが取り残される）', () => {
    expect(checkIndexDescription(html('古い説明'), '新しい説明')).toHaveLength(1)
  })

  it('description ごと無ければ止める', () => {
    expect(checkIndexDescription('<head></head>', '新しい説明')).toHaveLength(1)
  })
})

describe('checkNotFound', () => {
  const ok = '<head><meta name="robots" content="noindex" /></head>'

  it('noindex があって canonical が無ければ通す', () => {
    expect(checkNotFound(ok)).toEqual([])
  })

  it('ファイルが無ければ止める', () => {
    expect(checkNotFound('')).toEqual(['dist/404.html がありません'])
  })

  it('noindex が無ければ止める', () => {
    expect(checkNotFound('<head></head>')).toEqual([
      '404.html に noindex がありません（無いページが検索結果に出ます）',
    ])
  })

  it('canonical があれば止める（index.html を写すと付いてくる）', () => {
    const errors = checkNotFound(`${ok}<link rel="canonical" href="${SITE_URL}/" />`)
    expect(errors).toEqual([
      '404.html に canonical があります（無いページがトップの複製に見えます）',
    ])
  })

  it('両方おかしければ両方出す', () => {
    expect(checkNotFound(`<link rel="canonical" href="${SITE_URL}/" />`)).toHaveLength(2)
  })
})

describe('checkPage', () => {
  const page = {
    path: '/concert/10',
    name: 'いずみホール',
    fallback: { heading: 'いずみホール' },
  }
  const html = (over = {}) => {
    const { title = 'いずみホール | 関西音楽施設ディレクトリ' } = over
    const canonical = over.canonical ?? `${SITE_URL}/concert/10`
    const heading = over.heading ?? 'いずみホール'
    return `<head><title>${title}</title><link rel="canonical" href="${canonical}" /></head>
      <body><noscript><h1>${heading}</h1></noscript></body>`
  }

  it('題名・canonical・noscript が揃っていれば通す', () => {
    expect(checkPage(page, 200, html())).toEqual([])
  })

  it('200 で返らなければ、そこで打ち切る', () => {
    expect(checkPage(page, 404, '')).toEqual([
      '/concert/10 が 404 で返りました（静的HTMLが届いていません）',
    ])
  })

  /** 全ページが同じ index.html に戻る、という壊れ方をここで捕まえる */
  it('題名が施設のものでなければ止める', () => {
    const [msg] = checkPage(page, 200, html({ title: '関西音楽施設ディレクトリ' }))
    expect(msg).toMatch('/concert/10 の題名が違います')
  })

  it('canonical が別のURLを指していれば止める', () => {
    const [msg] = checkPage(page, 200, html({ canonical: `${SITE_URL}/` }))
    expect(msg).toMatch('/concert/10 の canonical が違います')
  })

  it('noscript に施設名が無ければ止める（JS 無しでは白紙になる）', () => {
    const [msg] = checkPage(page, 200, html({ heading: '関西音楽施設ディレクトリ' }))
    expect(msg).toBe('/concert/10 の noscript に施設名がありません')
  })

  it('canonical が別にあるページは、そちらと突き合わせる', () => {
    const top = { path: '/', name: undefined, canonical: '/concert' }
    const topHtml = `<head><title>関西音楽施設ディレクトリ</title>
      <link rel="canonical" href="${SITE_URL}/concert" /></head>`
    expect(checkPage(top, 200, topHtml)).toEqual([])
  })

  it('施設ページでない一覧は noscript の施設名を求めない', () => {
    const list = { path: '/practice', name: '練習場一覧' }
    const listHtml = `<head><title>練習場一覧 | 関西音楽施設ディレクトリ</title>
      <link rel="canonical" href="${SITE_URL}/practice" /></head>`
    expect(checkPage(list, 200, listHtml)).toEqual([])
  })

  it('壊れ方が重なれば、すべて出す', () => {
    const broken = `<head><title>ちがう</title><link rel="canonical" href="${SITE_URL}/" /></head>`
    expect(checkPage(page, 200, broken)).toHaveLength(3)
  })
})

describe('checkSitemap', () => {
  const xml = n =>
    `<urlset>${Array.from({ length: n }, (_, i) => `<url><loc>${SITE_URL}/${i}</loc></url>`).join('')}</urlset>`

  it('件数が合っていれば通す', () => {
    expect(checkSitemap(xml(3), 3)).toEqual([])
  })

  it('件数が足りなければ止める', () => {
    expect(checkSitemap(xml(2), 3)).toEqual(['sitemap.xml の件数が違います: 2 ≠ 3'])
  })

  it('sitemap そのものが届かなければ0件として止める', () => {
    expect(checkSitemap('', 3)).toEqual(['sitemap.xml の件数が違います: 0 ≠ 3'])
  })
})
