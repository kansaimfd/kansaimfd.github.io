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
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from './App'
import { concerthalls } from './datasets/concerthalls'
import { practices } from './datasets/practices'
import { isClosed } from './rental'
import { practiceDetailPath } from './practice'

// ルートは全部遅延読み込みなので、最初に描画するケースだけが最初の動的 import の
// 解決を待つ。CI の遅いランナーでは既定の 1000ms をまたいで落ちていた（1059ms・1080ms）。
// 待ち時間は見つからなかったときにしか消費されないので、広げても通常の実行は遅くならない
configure({ asyncUtilTimeout: 5000 })

// jsdom は window.scrollTo を実装していない。ScrollToTop が呼ぶだけで
// 「Not implemented」が出てテスト出力が埋まるので差し替えておく
vi.stubGlobal('scrollTo', vi.fn())

// 地図そのものは対象外。maplibre-gl は jsdom に無い WebGL と Worker を使う
vi.mock('./components/DetailMap', () => ({ default: () => <div data-testid="map" /> }))
vi.mock('./components/FacilityMap', () => ({ default: () => <div data-testid="map" /> }))

afterEach(cleanup)

/** 現在のURLを読めるようにする。絞り込みの状態がURLに載っているため */
function LocationProbe() {
  const { pathname, search } = useLocation()
  return <span data-testid="location">{pathname + search}</span>
}

const currentUrl = () => decodeURIComponent(screen.getByTestId('location').textContent ?? '')

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
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
   * GitHub Pages は存在しないパスにも 404.html（`scripts/build-static-pages.mjs` が
   * 書き出す。中身はこのSPA）を返すので、どんなURLもこのSPAまで届く。受け皿のルートが無いと、ヘッダーとフッターだけが出て
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

  // 施設名リンクは同一施設の複数ホールで重複するので、href の集合で見る。
  // 貸館を終えた施設は既定で隠すので、表示を選んだ状態で見る
  it('コンサートホール一覧から全施設の詳細ページへ行ける', () => {
    renderAt('/concert?closed=1')
    const hrefs = new Set(linkHrefs())
    const 抜け = concerthalls.filter(h => !hrefs.has(`/concert/${h.ID}`)).map(h => h.施設名)
    expect(抜け).toEqual([])
  })

  /**
   * 画面の中身が入れ替わってもフォーカスは押したリンクに残る。
   * 読み上げは新しいページに気づかず、Tab の続きも前のページの位置から始まる。
   * 最初の表示では動かさない（ブラウザのスクロール復元と #main への着地を上書きするため）
   */
  it('ページを移るとフォーカスが本文へ移り、最初の表示では動かない', async () => {
    renderAt('/concert')
    await screen.findByRole('heading', { level: 1 })
    expect(document.activeElement).toBe(document.body)

    const detail = screen
      .getAllByRole('link')
      .find(a => /^\/concert\/\d+$/.test(a.getAttribute('href') ?? ''))!
    // リンクの遷移は fireEvent では起きない（React Router のハンドラが受け取らない）。
    // 実際のクリックと同じ経路になるよう要素の click() を呼ぶ
    detail.click()
    await waitFor(() => expect(currentUrl()).toBe(detail.getAttribute('href')))
    expect(document.activeElement).toBe(document.getElementById('main'))
  })

  // 絞り込みはクエリに載るだけなので、条件を変えても入力欄からフォーカスを奪わない
  it('絞り込みではフォーカスを動かさない', () => {
    renderAt('/concert')
    const pill = screen.getByRole('button', { name: '大阪府' })
    pill.focus()
    fireEvent.click(pill)
    expect(document.activeElement).toBe(pill)
  })

  // 大ホール・中ホールが別々のカードに並ぶと、同じ住所と駅が繰り返されて施設の数が読めない
  it('コンサートホール一覧のカードは1施設1枚', async () => {
    renderAt('/concert?closed=1')
    await screen.findByRole('heading', { name: 'コンサートホール一覧', level: 1 })
    const cards = document.querySelectorAll('.facility-card')
    expect(cards.length).toBe(new Set(concerthalls.map(h => h.ID)).size)
  })

  // ホール併設の部屋はコンサートホール側の詳細ページへ行く
  it('練習場一覧から全施設の詳細ページへ行ける', async () => {
    renderAt('/practice?closed=1')
    await screen.findByRole('heading', { name: '練習場一覧', level: 1 })
    const hrefs = new Set(linkHrefs())
    const 抜け = practices.filter(p => !hrefs.has(practiceDetailPath(p))).map(p => p.施設名)
    expect(抜け).toEqual([])
  })

  it.each([
    ['/concert', concerthalls],
    ['/practice', practices],
  ] as const)('%s は貸館を終えた施設を既定で隠し、選べば出す', async (path, list) => {
    const closed = list.filter(f => isClosed(f.貸館)).length
    renderAt(path)
    // 件数は数字だけで探すと、カードの面積・定員と取り違える
    const count = () => document.querySelector('.result-bar__count strong')?.textContent
    const toggle = await screen.findByRole('button', { name: /貸館終了・閉館も表示/ })
    expect(count()).toBe(String(list.length - closed))

    fireEvent.click(toggle)
    expect(currentUrl()).toBe(`${path}?closed=1`)
    expect(count()).toBe(String(list.length))
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
   * 見出しを押しても並びが変わらない、は表示だけ見ていると気づけない。
   * 押せること（上のテスト）と、押した結果が一覧に反映されることは別
   */
  it('表の見出しを押すと並びが変わる', async () => {
    renderAt('/concert')
    fireEvent.click(screen.getByRole('button', { name: '表' }))
    const rows = () =>
      Array.from(document.querySelectorAll('tbody tr td:first-child')).map(td => td.textContent)

    await screen.findByRole('table')
    const 昇順 = rows()
    fireEvent.click(screen.getByRole('button', { name: '施設名' }))

    // 同名の施設（複数ホール）は同着で元の順序を保つので、単純な逆順にはならない。
    // 見るのは「押したら並びが変わり、先頭と末尾が入れ替わる」ところまで
    expect(rows()).not.toEqual(昇順)
    expect(rows()[0]).toBe(昇順[昇順.length - 1])
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
    ['/concert', 'コンサートホール一覧', concerthalls.filter(h => !isClosed(h.貸館)).length],
    ['/practice', '練習場一覧', practices.filter(p => !isClosed(p.貸館)).length],
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

/**
 * 絞り込みの状態はURLが持つ。**共有したリンクが同じ条件で開くこと**が肝で、
 * 状態を `useState` に戻してしまうと型チェックも lint も通ったまま静かに壊れる。
 */
describe('絞り込みとURL', () => {
  it('絞り込むとURLに条件が載る', () => {
    renderAt('/concert')
    expect(currentUrl()).toBe('/concert')

    fireEvent.click(screen.getByRole('button', { name: '大阪府' }))
    expect(currentUrl()).toBe('/concert?pref=大阪府')
  })

  it('条件の付いたURLで開くと、その条件で絞り込まれている', () => {
    renderAt('/concert?pref=大阪府')

    expect(screen.getByRole('button', { name: /大阪府/ })).toHaveProperty('ariaPressed', 'true')
    const 大阪の件数 = concerthalls.filter(h => h.都道府県 === '大阪府' && !isClosed(h.貸館)).length
    expect(screen.getByText(String(大阪の件数))).toBeDefined()
  })

  // 練習場一覧にしか無かった条件をコンサートホール一覧にも足した。
  // 導線としてそこにあり、押した結果がURLに載ることまでを見る
  it('コンサートホール一覧でも市区町村・最寄駅・徒歩で絞り込める', () => {
    renderAt('/concert')

    fireEvent.change(screen.getByLabelText('市区町村'), { target: { value: '大阪市北区' } })
    expect(currentUrl()).toBe('/concert?city=大阪市北区')

    fireEvent.change(screen.getByLabelText('最寄駅徒歩（分以内）'), { target: { value: '10' } })
    expect(currentUrl()).toBe('/concert?city=大阪市北区&walk=10')
  })

  /**
   * 絞り込みは府県 → 市区町村 → 最寄駅の順に狭まる。上を変えたら下は選び直しになるので、
   * 残したまま必ず0件になる組み合わせ（大阪府＋三宮駅）を作らない
   */
  it('府県を変えると市区町村・最寄駅は落とす', () => {
    renderAt('/concert?city=大阪市北区&station=大阪駅')
    fireEvent.click(screen.getByRole('button', { name: '京都府' }))
    expect(currentUrl()).toBe('/concert?pref=京都府')
  })

  it('市区町村を変えると最寄駅は落とす', () => {
    renderAt('/practice?station=三宮駅')
    fireEvent.change(screen.getByLabelText('市区町村'), { target: { value: '大阪市北区' } })
    expect(currentUrl()).toBe('/practice?city=大阪市北区')
  })

  /**
   * 選択肢は選んだ府県の中だけに絞る。**ただし、いま選ばれている値は範囲の外でも残す。**
   * URLは手で書き換えられるので、絞り込みには効いているのに選択欄が未選択に見えると
   * 「0件だがなぜか分からない」画面になる
   */
  it('最寄駅の選択肢は選んだ府県の中に絞り、選択中の駅だけは残す', () => {
    renderAt('/concert?pref=京都府&station=大阪駅')
    const 最寄駅 = screen.getByLabelText('最寄駅')
    const 束 = Array.from(最寄駅.querySelectorAll('optgroup')).map(g => g.getAttribute('label'))
    // 京都府の駅に加えて、選択中の大阪駅がその府県の束として残る
    expect(束).toEqual(['大阪府', '京都府'])
    expect((最寄駅 as HTMLSelectElement).value).toBe('大阪駅')
  })

  it('表示の切り替えもURLに載る', () => {
    renderAt('/practice')
    fireEvent.click(screen.getByRole('button', { name: '表' }))
    expect(currentUrl()).toBe('/practice?view=table')
  })
})
