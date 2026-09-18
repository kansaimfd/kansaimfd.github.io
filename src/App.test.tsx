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
