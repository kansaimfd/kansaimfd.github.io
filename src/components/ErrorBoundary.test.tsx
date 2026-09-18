// @vitest-environment jsdom
/**
 * 読み込み失敗の受け皿が働くかを見る。
 *
 * 境界が無い、あるいは外れていると、失敗は白紙の画面になる。
 * 型チェックも lint も通ってしまうので、実際に投げさせて確かめる。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, useLocation } from 'react-router-dom'
import RouteErrorBoundary from './ErrorBoundary'
import App from '../App'

// ページの取得が失敗した状況を作る（新しいビルドを公開したあとの古いタブで実際に起きる）
vi.mock('../pages/AboutPage', () => {
  throw new Error('chunk load failed')
})

// jsdom は window.scrollTo を実装していない。ScrollToTop が呼ぶだけで警告が出る
vi.stubGlobal('scrollTo', vi.fn())

// React は境界で受け止めた例外もコンソールへ出す。テスト出力を埋めるので黙らせる
beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

/** `/concert/10` でだけ落ちる。チャンクやJSONの取得に失敗した詳細ページに当たる */
function Boom(): React.ReactNode {
  const { pathname } = useLocation()
  if (pathname === '/concert/10') throw new Error('chunk load failed')
  return <p>本文</p>
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      {/* 境界の外に置く。案内が出ているあいだも押せる行き先が要る */}
      <Link to="/practice">練習場へ</Link>
      <RouteErrorBoundary>
        <Boom />
      </RouteErrorBoundary>
    </MemoryRouter>,
  )

describe('RouteErrorBoundary', () => {
  it('失敗していなければ中身をそのまま出す', () => {
    renderAt('/concert')
    expect(screen.getByText('本文')).toBeDefined()
  })

  it('描画が失敗したら案内と行き先を出す', () => {
    renderAt('/concert/10')

    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByRole('heading', { name: '表示できませんでした', level: 1 })).toBeDefined()
    // 白紙にせず、再読み込みと一覧への行き先を必ず添える
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeDefined()
    const hrefs = Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href'))
    expect(hrefs).toContain('/concert')
    expect(hrefs).toContain('/practice')
  })

  it('URLが変わったら案内を消す', () => {
    renderAt('/concert/10')
    expect(screen.getByRole('alert')).toBeDefined()

    // 境界はエラーを覚え続ける。消さないと、リンクで移った先でも案内が出たままになる
    fireEvent.click(screen.getByRole('link', { name: '練習場へ' }))

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('本文')).toBeDefined()
  })
})

describe('App への結線', () => {
  /**
   * 境界は置いてあっても、Suspense の内側に入っていたり `App` から外れていたりすると
   * 働かない。**外れていることは型チェックにも lint にも引っかからない**ので、
   * 実際にページの取得を失敗させて、白紙にならないことを確かめる。
   */
  it('ページの読み込みが失敗しても、案内と画面の骨格が残る', async () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toBeDefined()
    // ヘッダーごと消える（＝白紙になる）のが、境界が無いときの壊れ方
    expect(screen.getByRole('navigation')).toBeDefined()
  })
})
