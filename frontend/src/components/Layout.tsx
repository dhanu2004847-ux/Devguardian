import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, LayoutDashboard, GitBranch, Settings, LogOut, Bot, CheckSquare, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Sidebar follows the repo you opened: URL first, then last-used, then 1.
  const repoMatch = location.pathname.match(/^\/repos\/(\d+)/);
  const urlRepoId = repoMatch?.[1];

  useEffect(() => {
    if (urlRepoId) {
      try {
        localStorage.setItem('selectedRepoId', urlRepoId);
      } catch {
        /* ignore */
      }
    }
  }, [urlRepoId]);

  let storedRepoId: string | null = null;
  try {
    storedRepoId = localStorage.getItem('selectedRepoId');
  } catch {
    /* ignore */
  }
  const repoId = urlRepoId ?? storedRepoId ?? '1';

  const path = location.pathname;
  const isFindings = path.endsWith('/findings');
  const isFixes = path.endsWith('/fixes');
  const isRepoDetail = /^\/repos\/\d+$/.test(path);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <nav
        style={{
          width: '260px',
          flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          padding: '28px 20px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <Link to="/dashboard" style={{ textDecoration: 'none', display: 'block', marginBottom: '28px' }}>
  <Logo size={44} subtitle />
</Link>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Link
              to="/dashboard"
              style={navLinkStyle(path === '/dashboard')}
              aria-current={path === '/dashboard' ? 'page' : undefined}
            >
              <LayoutDashboard size={16} /> Dashboard
            </Link>
            <Link to="/ai" style={navLinkStyle(path === '/ai')} aria-current={path === '/ai' ? 'page' : undefined}>
              <Bot size={16} /> AI Agent Hub
            </Link>
            <Link
              to={`/repos/${repoId}`}
              style={navLinkStyle(isRepoDetail)}
              aria-current={isRepoDetail ? 'page' : undefined}
            >
              <GitBranch size={16} /> Repository Detail
            </Link>
            <Link
              to={`/repos/${repoId}/findings`}
              style={navLinkStyle(isFindings)}
              aria-current={isFindings ? 'page' : undefined}
            >
              <ShieldAlert size={16} /> Findings & Scans
            </Link>
            <Link
              to={`/repos/${repoId}/fixes`}
              style={navLinkStyle(isFixes)}
              aria-current={isFixes ? 'page' : undefined}
            >
              <CheckSquare size={16} /> PR Review & Fixes
            </Link>
            <Link
              to="/settings"
              style={navLinkStyle(path === '/settings')}
              aria-current={path === '/settings' ? 'page' : undefined}
            >
              <Settings size={16} /> Settings
            </Link>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-dim)',
              opacity: 0.6,
              margin: '24px 0 8px',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}
          >
            Quick Actions
          </div>
          <button
            onClick={() => navigate(`/repos/${repoId}`)}
            style={{
              width: '100%',
              background: 'rgba(34, 211, 166, 0.1)',
              border: '1px solid var(--accent-dim)',
              color: 'var(--accent)',
              padding: '10px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'var(--sans)',
            }}
          >
            <Play size={16} /> Scan this repository
          </button>
        </div>

        <div>
          {user?.email && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-dim)',
                padding: '0 0 6px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={user.email}
            >
              {user.email}
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              padding: '8px 0',
              width: '100%',
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, minWidth: 0, padding: '48px 60px' }}>
        <Outlet />
      </main>
    </div>
  );
};

const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  color: isActive ? 'var(--text)' : 'var(--text-dim)',
  textDecoration: 'none',
  fontSize: '13.5px',
  padding: '8px 12px',
  borderRadius: '6px',
  background: isActive ? 'var(--surface-2)' : 'transparent',
  borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
  transition: 'all 0.15s',
});