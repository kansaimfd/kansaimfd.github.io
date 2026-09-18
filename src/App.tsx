import { Suspense, lazy } from 'react'
import { Routes, Route, Link, NavLink } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'

/**
 * **ルートは全部分割する。一覧も静的に読まない。**
 *
 * 以前はコンサートホール一覧だけ静的に読んでいた（入口なので1往復を惜しんだ）。
 * ただしその一覧は284ホールぶんのJSONを抱えていて、**入口以外から来た人にも
 * まるごと配られていた**。`/concert/10` を直接開く人も、練習場だけを見る人も、
 * このサイトについてを読む人も、見ないホール一覧のデータを落としてから
 * 目的のページを読むことになる（外部リンク・検索結果からの流入がこれに当たる）。
 *
 * 分割すると入口の表示に1往復増えるが、入口以外の全ページが gzip 約90KB軽くなる。
 * 一覧そのものは分割後も1ファイルで届くので、増えるのは往復であって転送量ではない。
 */
const ConcertHallListPage = lazy(() => import('./pages/ConcertHallListPage'))
const ConcertHallDetailPage = lazy(() => import('./pages/ConcertHallDetailPage'))
const PracticeListPage = lazy(() => import('./pages/PracticeListPage'))
const PracticeDetailPage = lazy(() => import('./pages/PracticeDetailPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const NAV = [
  { to: '/concert', label: 'コンサートホール' },
  { to: '/practice', label: '練習場' },
  { to: '/about', label: 'このサイトについて' },
]

export default function App() {
  return (
    <div className="app">
      <ScrollToTop />
      <a href="#main" className="skip-link">
        本文へスキップ
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand">
            関西音楽施設
            <span className="brand__accent">Directory</span>
          </Link>
          <nav className="site-nav">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? 'site-nav__link site-nav__link--active' : 'site-nav__link'
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="site-main" id="main">
        <Suspense fallback={<p className="loading">読み込み中…</p>}>
          <Routes>
            <Route path="/" element={<ConcertHallListPage />} />
            <Route path="/concert" element={<ConcertHallListPage />} />
            <Route path="/concert/:id" element={<ConcertHallDetailPage />} />
            <Route path="/practice" element={<PracticeListPage />} />
            <Route path="/practice/:id" element={<PracticeDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
            {/*
              GitHub Pages は 404.html として index.html を返すので、存在しないパスも
              ここまで届く。受け皿が無いと本文が空のまま何も出ない
            */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {/*
        一覧ページの中にあったものを画面の骨格へ移した。
        ページ側に置くと、表示を切り替えただけで消えたり、詳細ページには無かったりする
      */}
      <footer className="site-foot">
        <span>KANSAI MFD · 2026</span>
        {/* 純粋な飾り。読み上げると「おんぷ おんぷ おんぷ」になるだけなので隠す */}
        <span className="site-foot__mark" aria-hidden>
          ♪ ♫ ♪
        </span>
      </footer>
    </div>
  )
}
