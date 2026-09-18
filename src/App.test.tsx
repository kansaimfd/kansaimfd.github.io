// @vitest-environment jsdom
/**
 * ルーティングの結線を見るスモークテスト。
 *
 * 見た目や絞り込みの挙動は対象にしない。捕まえたいのは「ページはあるのに
 * そこへ行く手段が無い」類の欠落で、実際にコンサートホール一覧から詳細ページへの
 * リンクと、ヘッダーの練習場リンクが揃って抜けていた。どちらも型チェックも
 * lint も通るので、描画して辿る以外に気づく方法が無い。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { concerthalls } from './datasets/concerthalls'
import { practices } from './datasets/practices'

// jsdom は window.scrollTo を実装していない。ScrollToTop が呼ぶだけで
// 「Not implemented」が出てテスト出力が埋まるので差し替えておく
vi.stubGlobal('scrollTo', vi.fn())

// 地図そのものは対象外。leaflet は jsdom に無い API を使う
vi.mock('./components/DetailMap', () => ({ default: () => <div data-testid="map" /> }))
vi.mock('./components/FacilityMap', () => ({ default: () => <div data-testid="map" /> }))

afterEach(cleanup)

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const linkHrefs = (root: ParentNode = document) =>
  Array.from(root.querySelectorAll('a')).map(a => a.getAttribute('href'))

const firstHall = concerthalls[0]
const firstPractice = practices[0]

describe('ルーティング', () => {
  it.each([
    ['/', 'コンサートホール一覧'],
    ['/concert', 'コンサートホール一覧'],
    ['/practice', '練習場一覧'],
    ['/about', 'このサイトについて'],
    [`/concert/${firstHall.ID}`, firstHall.施設名],
    [`/practice/${firstPractice.ID}`, firstPractice.施設名],
  ])('%s が描画される', async (path, heading) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { name: heading, level: 1 })).toBeDefined()
  })

  // IDは外部からのリンクに使うので、知らないIDでも落ちずに案内を出す
  it('存在しないIDでは見つからない旨を出す', async () => {
    renderAt('/concert/999999')
    expect(await screen.findByText('施設が見つかりません。')).toBeDefined()
  })

  /**
   * GitHub Pages は存在しないパスにも index.html（を複製した 404.html）を返すので、
   * どんなURLもこのSPAまで届く。受け皿のルートが無いと、ヘッダーとフッターだけが出て
   * 本文が空になる。空白は型チェックにも lint にも引っかからない
   */
  it('知らないURLでは404の案内を出す', async () => {
    renderAt('/no-such-page')
    const heading = await screen.findByRole('heading', { name: 'ページが見つかりません' })
    expect(heading).toBeDefined()
    // 行き止まりにしない（一覧へ戻る導線があること）
    expect(linkHrefs()).toContain('/concert')
  })
})

describe('ページの題名', () => {
  /**
   * 題名を出し分けないと、全ページが index.html の題名のままになる。タブを並べても
   * 履歴を辿ってもページを区別できず、ブックマークも全部同じ名前になる。
   * useDocumentTitle の呼び忘れは型チェックにも lint にも引っかからない
   */
  it.each([
    ['/concert', 'コンサートホール一覧'],
    ['/practice', '練習場一覧'],
    ['/about', 'このサイトについて'],
    [`/concert/${firstHall.ID}`, firstHall.施設名],
    [`/practice/${firstPractice.ID}`, firstPractice.施設名],
    ['/no-such-page', 'ページが見つかりません'],
  ])('%s の題名にページ名が入る', async (path, name) => {
    renderAt(path)
    await screen.findByRole('heading', { level: 1 })
    expect(document.title).toContain(name as string)
  })
})

describe('導線', () => {
  it('ヘッダーから各セクションへ行ける', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation')
    const paths = linkHrefs(nav)
    expect(paths).toContain('/concert')
    expect(paths).toContain('/practice')
    expect(paths).toContain('/about')
  })

  // 施設名リンクは同一施設の複数ホールで重複するので、href の集合で見る
  it('コンサートホール一覧から全施設の詳細ページへ行ける', () => {
    renderAt('/concert')
    const hrefs = new Set(linkHrefs())
    const 抜け = concerthalls.filter(h => !hrefs.has(`/concert/${h.ID}`)).map(h => h.施設名)
    expect(抜け).toEqual([])
  })

  it('練習場一覧から全施設の詳細ページへ行ける', async () => {
    renderAt('/practice')
    await screen.findByRole('heading', { name: '練習場一覧', level: 1 })
    const hrefs = new Set(linkHrefs())
    const 抜け = practices.filter(p => !hrefs.has(`/practice/${p.ID}`)).map(p => p.施設名)
    expect(抜け).toEqual([])
  })

  /**
   * 表の見出しからの並び替えは th の onClick で書かれていて、マウスでしか押せなかった。
   * 見た目は同じなので、button になっているかは描いて役割で探すしかない
   */
  it('表の見出しをキーボードで辿れる形にしている', async () => {
    renderAt('/concert')
    fireEvent.click(screen.getByRole('button', { name: '表' }))
    await screen.findByRole('table')
    expect(screen.getByRole('button', { name: '客席数' })).toBeDefined()
  })

  /**
   * 設備の3値は記号（〇 × —）で出している。記号だけだと読み上げで
   * 「なし」と「未調査」の区別が消えるので、言葉が併記されていることを見る
   */
  it('設備の記号に読み上げ用の言葉を添えている', async () => {
    renderAt('/concert')
    fireEvent.click(screen.getByRole('button', { name: '表' }))
    await screen.findByRole('table')
    const 言葉 = ['あり', 'なし', '未調査'].filter(t => screen.queryAllByText(t).length > 0)
    expect(言葉.length).toBeGreaterThan(0)
  })

  /**
   * コンサートホール一覧は、表・地図の中身はあるのに切り替えボタンだけが無い状態で
   * しばらく放置されていた（表示は 'list' 固定だった）。型チェックも lint も通るので、
   * 描画してボタンを探す以外に気づく方法が無い。
   */
  it.each([
    ['/concert', 'コンサートホール一覧', concerthalls.length],
    ['/practice', '練習場一覧', practices.length],
  ])('%s で件数と表示切替が出ている', async (path, heading, count) => {
    renderAt(path)
    await screen.findByRole('heading', { name: heading as string, level: 1 })

    for (const label of ['リスト', '表', '地図']) {
      expect(screen.getByRole('button', { name: label })).toBeDefined()
    }
    expect(screen.getByText(String(count))).toBeDefined()

    // 表に切り替えたら表が出る（ボタンはあるが中身が繋がっていない、を捕まえる）
    fireEvent.click(screen.getByRole('button', { name: '表' }))
    expect(await screen.findByRole('table')).toBeDefined()
  })
})
