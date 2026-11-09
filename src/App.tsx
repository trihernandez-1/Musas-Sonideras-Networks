import { NavLink, Route, Routes } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import HomePage from './pages/HomePage';
import InboxPage from './pages/InboxPage';
import CollaboratorsPage from './pages/CollaboratorsPage';
import CollaboratorDetailPage from './pages/CollaboratorDetailPage';
import NetworkPage from './pages/NetworkPage';
import MapPage from './pages/MapPage';
import PostDetailPage from './pages/PostDetailPage';
import GalleryPage from './pages/GalleryPage';
import FieldNotesPage from './pages/FieldNotesPage';

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
      <header className="topbar no-print">
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
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/collaborators" element={<CollaboratorsPage />} />
          <Route path="/collaborators/:id" element={<CollaboratorDetailPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/field-notes" element={<FieldNotesPage />} />
        </Routes>
      </main>
    </div>
  );
}
