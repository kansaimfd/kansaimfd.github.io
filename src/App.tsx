import { Suspense, lazy } from 'react'
import { Routes, Route, Link, NavLink } from 'react-router-dom'
import ConcertHallListPage from './pages/ConcertHallListPage'
import ScrollToTop from './components/ScrollToTop'

// 入口のコンサートホール一覧だけ静的に読む。残りはルート単位で分割する。
// 施設データはページごとに別のJSONなので、練習場79件（239KB）を
// コンサートホールしか見ない利用者に読ませずに済む
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
        <span className="site-foot__mark">♪ ♫ ♪</span>
      </footer>
    </div>
  )
}
