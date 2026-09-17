import { Routes, Route, Link, NavLink } from 'react-router-dom'
import AboutPage from './pages/AboutPage'
import ConcertHallListPage from './pages/ConcertHallListPage'
import ConcertHallDetailPage from './pages/ConcertHallDetailPage'
import PracticeListPage from './pages/PracticeListPage'
import PracticeDetailPage from './pages/PracticeDetailPage'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-navy-700 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-8">
          <Link to="/" className="font-serif font-bold text-xl text-white tracking-wide">
            関西音楽施設
            <span className="text-gold-400 ml-1">Directory</span>
          </Link>
          <nav className="flex items-center gap-6">
            <NavLink
              to="/concert"
              className={({ isActive }) =>
                isActive
                  ? 'text-gold-400 font-medium text-sm'
                  : 'text-navy-100 hover:text-white text-sm transition-colors'
              }
            >
              コンサートホール
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                isActive
                  ? 'text-gold-400 font-medium text-sm'
                  : 'text-navy-100 hover:text-white text-sm transition-colors'
              }
            >
              このサイトについて
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <Routes>
          <Route path="/" element={<ConcertHallListPage />} />
          <Route path="/concert" element={<ConcertHallListPage />} />
          <Route path="/concert/:id" element={<ConcertHallDetailPage />} />
          <Route path="/practice" element={<PracticeListPage />} />
          <Route path="/practice/:id" element={<PracticeDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
    </div>
  )
}
