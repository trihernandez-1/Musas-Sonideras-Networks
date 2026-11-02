import { NavLink, Route, Routes } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import HomePage from './pages/HomePage';
import StubPage from './pages/StubPage';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/inbox', label: 'Inbox' },
  { to: '/collaborators', label: 'Collaborators' },
  { to: '/network', label: 'Network' },
  { to: '/map', label: 'Map' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/field-notes', label: 'Field Notes' },
];

export default function App() {
  const [theme, toggleTheme] = useTheme();

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">Musas Sonideras</span>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </header>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/inbox" element={<StubPage title="Inbox — Add a Post" stage="Stage 2" />} />
          <Route
            path="/collaborators"
            element={<StubPage title="Collaborators" stage="Stage 2" />}
          />
          <Route path="/network" element={<StubPage title="Network" stage="Stage 3" />} />
          <Route path="/map" element={<StubPage title="Map" stage="Stage 4" />} />
          <Route path="/gallery" element={<StubPage title="Gallery / Timeline" stage="Stage 5" />} />
          <Route
            path="/field-notes"
            element={<StubPage title="Field Notes" stage="Stage 5" />}
          />
        </Routes>
      </main>
    </div>
  );
}
