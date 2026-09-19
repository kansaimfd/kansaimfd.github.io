import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  SITE_URL,
  SITE_NAME,
  pageTitle,
  concertDescription,
  practiceDescription,
  facilityJsonLd,
  buildPages,
  renderPage,
  renderNotFound,
  buildSitemap,
  outputFiles,
} from './static-pages.mjs'
import * as title from '../src/title.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const indexHtml = readFileSync(resolve(root, 'index.html'), 'utf-8')

const base = {
  ID: 10,
  施設名: 'テストホール',
  都道府県: '奈良県',
  市区町村: '大和郡山市',
  番地以下: '北郡山町211-3',
  緯度: 34.65,
  経度: 135.78,
}

describe('題名は src/title.ts と同じ規則で作る', () => {
  it('サイト名が一致する（片方だけ変えるとタブと検索結果で名前が食い違う）', () => {
    expect(SITE_NAME).toBe(title.SITE_NAME)
  })

  it.each([['テストホール'], [undefined], ['  ']])('pageTitle(%j)', name => {
    expect(pageTitle(name)).toBe(title.pageTitle(name))
  })
})

describe('concertDescription', () => {
  it('客席数の分かるホールと最寄駅を並べる', () => {
    const f = {
      ...base,
      最寄駅: [{ 駅: '近鉄郡山駅', 駅徒歩: 7 }],
      部屋: [
        { 部屋名: '大ホール', 客席数: 1005 },
        { 客席数: 300 },
        { 部屋名: 'リハーサル室', 面積: 107 },
      ],
    }
    expect(concertDescription(f)).toBe(
      'テストホール（奈良県大和郡山市）のホール情報。大ホール 1005席・300席。近鉄郡山駅から徒歩7分。客席数・舞台寸法・ピアノなどの設備を掲載しています。',
    )
  })

  it('客席数も最寄駅も無ければ、その文を省く', () => {
    expect(concertDescription({ ...base, 部屋: [{ 部屋名: '大ホール' }] })).toBe(
      'テストホール（奈良県大和郡山市）のホール情報。客席数・舞台寸法・ピアノなどの設備を掲載しています。',
    )
    expect(concertDescription(base)).toBe(concertDescription({ ...base, 部屋: [] }))
  })

  it.each([
    ['終了', '貸館を終了した施設です。'],
    ['廃止', '現在は存在しない施設です。'],
    ['休止', '貸館を休止中の施設です。'],
  ])('貸館 %s は先頭でそう言う', (状態, prefix) => {
    expect(concertDescription({ ...base, 貸館: { 状態 } })).toMatch(new RegExp(`^${prefix}`))
  })

  it('予定（まだ借りられる）は何も足さない', () => {
    expect(concertDescription({ ...base, 貸館: { 状態: '予定' } })).toMatch(/^テストホール/)
  })
})

describe('practiceDescription', () => {
  it('部屋数とピアノの有無、最寄駅を並べる', () => {
    const f = {
      ...base,
      最寄駅: [{ 駅: '本町駅' }],
      部屋: [{ 部屋名: 'A', ピアノ有無: true }, { 部屋名: 'B' }],
    }
    expect(practiceDescription(f)).toBe(
      'テストホール（奈良県大和郡山市）の音楽練習場の情報。音楽に使える部屋 2室（ピアノのある部屋あり）。最寄りは本町駅。定員・面積・楽器の可否などを掲載しています。',
    )
  })

  it('ピアノが無ければ添えず、部屋が無ければ部屋の文を省く', () => {
    expect(practiceDescription({ ...base, 部屋: [{ ピアノ有無: false }] })).toContain(
      '音楽に使える部屋 1室。',
    )
    expect(practiceDescription(base)).not.toContain('部屋')
  })

  it('名前で鉄道駅と区別のつかないバス停には（バス停）を添える', () => {
    const d = s => practiceDescription({ ...base, 最寄駅: [s] })
    expect(d({ 種別: 'バス停', 駅: 'しづかホール前', 駅徒歩: 1 })).toContain(
      'しづかホール前（バス停）から徒歩1分',
    )
    expect(d({ 種別: 'バス停', 駅: '市役所前バス停' })).toContain('最寄りは市役所前バス停。')
  })
})

describe('facilityJsonLd', () => {
  it('コンサートホールは MusicVenue で、最大の客席数を収容人数にする', () => {
    const ld = facilityJsonLd(
      {
        ...base,
        URL: 'https://example.jp/',
        TEL: '0743-00-0000',
        部屋: [{ 客席数: 300 }, { 客席数: 1005 }, {}],
      },
      'concert',
      `${SITE_URL}/concert/10`,
    )
    expect(ld).toEqual({
      '@context': 'https://schema.org',
      '@type': 'MusicVenue',
      name: 'テストホール',
      url: 'https://kansaimfd.github.io/concert/10',
      sameAs: 'https://example.jp/',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'JP',
        addressRegion: '奈良県',
        addressLocality: '大和郡山市',
        streetAddress: '北郡山町211-3',
      },
      geo: { '@type': 'GeoCoordinates', latitude: 34.65, longitude: 135.78 },
      telephone: '0743-00-0000',
      maximumAttendeeCapacity: 1005,
    })
  })

  it('練習場は Place で、分からない項目は書かない', () => {
    const ld = facilityJsonLd(base, 'practice', 'u')
    expect(ld['@type']).toBe('Place')
    expect(ld).not.toHaveProperty('sameAs')
    expect(ld).not.toHaveProperty('telephone')
    expect(ld).not.toHaveProperty('maximumAttendeeCapacity')
  })
})

describe('buildPages', () => {
  const pages = buildPages({
    concert: [{ ...base, 最終確認日: '2026-09-04' }],
    practice: [{ ...base, ID: 30, 施設名: '練習場' }],
  })

  it('トップ・一覧・このサイトについて・施設ごとのページを作る', () => {
    expect(pages.map(p => p.path)).toEqual([
      '/',
      '/concert',
      '/practice',
      '/about',
      '/concert/10',
      '/practice/30',
    ])
  })

  it('施設ページは施設名・構造化データ・最終確認日を持つ', () => {
    const concert = pages.find(p => p.path === '/concert/10')
    expect(concert.name).toBe('テストホール')
    expect(concert.jsonLd.url).toBe('https://kansaimfd.github.io/concert/10')
    expect(concert.lastmod).toBe('2026-09-04')
    expect(pages.find(p => p.path === '/practice/30').jsonLd['@type']).toBe('Place')
  })
})

describe('renderPage', () => {
  const page = {
    path: '/concert/10',
    name: 'A&B "ホール"',
    description: '<説明>',
    jsonLd: { name: '</script><script>alert(1)</script>' },
  }
  const html = renderPage(indexHtml, page)

  it('題名と説明を置き換え、1つずつしか持たない', () => {
    expect(html).toContain('<title>A&amp;B &quot;ホール&quot; | 関西音楽施設ディレクトリ</title>')
    expect(html).toContain('<meta name="description" content="&lt;説明&gt;" />')
    expect(html.match(/<title>/g)).toHaveLength(1)
    expect(html.match(/name="description"/g)).toHaveLength(1)
  })

  it('canonical と OGP は絶対URLで持つ', () => {
    expect(html).toContain('<link rel="canonical" href="https://kansaimfd.github.io/concert/10" />')
    expect(html).toContain(
      '<meta property="og:url" content="https://kansaimfd.github.io/concert/10" />',
    )
    expect(html).toContain(
      '<meta property="og:title" content="A&amp;B &quot;ホール&quot; | 関西音楽施設ディレクトリ" />',
    )
  })

  it('構造化データの中の </script> で script 要素が閉じられない', () => {
    expect(html).toContain(
      '<script type="application/ld+json">{"name":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"}</script>',
    )
  })

  it('構造化データが無いページには script を足さず、本文は変えない', () => {
    const plain = renderPage(indexHtml, {
      path: '/about',
      name: 'このサイトについて',
      description: 'd',
    })
    expect(plain).not.toContain('application/ld+json')
    expect(plain.slice(plain.indexOf('<body>'))).toBe(indexHtml.slice(indexHtml.indexOf('<body>')))
  })

  it('index.html から題名か説明が消えていたら止める', () => {
    expect(() => renderPage('<head></head>', page)).toThrow(/見つかりません/)
  })
})

it('404.html は検索に載せず、canonical を持たない', () => {
  const html = renderNotFound(indexHtml)
  expect(html).toContain('<meta name="robots" content="noindex" />')
  expect(html).not.toContain('canonical')
})

it('sitemap は絶対URLを並べ、日付のあるページにだけ lastmod を付ける', () => {
  expect(buildSitemap([{ path: '/' }, { path: '/concert/10', lastmod: '2026-09-04' }])).toBe(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://kansaimfd.github.io/</loc></url>
  <url><loc>https://kansaimfd.github.io/concert/10</loc><lastmod>2026-09-04</lastmod></url>
</urlset>
`,
  )
})

it.each([
  ['/', ['index.html']],
  ['/concert', ['concert.html', 'concert/index.html']],
  ['/practice', ['practice.html', 'practice/index.html']],
  ['/about', ['about.html']],
  ['/concert/10', ['concert/10.html']],
])('outputFiles(%s)', (path, files) => {
  expect(outputFiles(path)).toEqual(files)
})
