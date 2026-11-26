import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, ShieldAlert, CheckSquare, User, KeyRound, LogOut, Plus, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchRepos, connectRepo, disconnectRepo } from '../lib/repoApi';
import type { Repo } from '../lib/repoApi';

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '24px',
  marginBottom: '24px',
};

const linkBtn: React.CSSProperties = {
  background: 'rgba(34, 211, 166, 0.1)',
  border: '1px solid var(--accent-dim)',
  color: 'var(--accent)',
  padding: '6px 10px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const loadRepos = async () => {
    try {
      setRepos(await fetchRepos());
      setError(null);
    } catch {
      setError('Could not load repositories. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepos();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = fullName
  .trim()
  .replace(/^https?:\/\/github\.com\//i, '')
  .replace(/\.git$/i, '')
  .replace(/\/$/, '');
if (!name) return;
if (!/^[\w.-]+\/[\w.-]+$/.test(name)) {
      setConnectError('Use the format owner/repo, e.g. octocat/hello-world');
      return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      await connectRepo(name);
      setFullName('');
      await loadRepos();
    } catch {
      setConnectError('Could not connect that repository. Check the name and that your GitHub token can access it.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (repo: Repo) => {
    if (!window.confirm(`Disconnect ${repo.name}?`)) return;
    try {
      await disconnectRepo(repo.id);
      await loadRepos();
    } catch {
      setError('Could not disconnect that repository. It may still have scans or pull requests linked to it.');
    }
  };

  const openRepo = (id: number, sub = '') => {
    try {
      localStorage.setItem('selectedRepoId', String(id));
    } catch {
      /* ignore */
    }
    navigate(`/repos/${id}${sub}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ color: 'var(--text)', maxWidth: '800px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 6px 0' }}>Settings & Integrations</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>
          Your account, connected repositories, and how DevGuardian is configured.
        </p>
      </div>

      {/* Account */}
      <div style={card}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={16} /> Account
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '2px' }}>Signed in as</div>
            <div style={{ fontSize: '14px', fontFamily: 'var(--mono)' }}>{user?.email ?? '—'}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      {/* Repositories */}
      <div style={card}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>Connected Repositories</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: '0 0 20px 0' }}>
          Repositories DevGuardian scans and opens fix pull requests against.
        </p>

        {/* Connect form */}
        <form onSubmit={handleConnect} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="owner/repo  (e.g. octocat/hello-world)"
            aria-label="Repository full name"
            style={{
              flex: 1,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '10px 12px',
              color: 'var(--text)',
              fontSize: '13px',
              fontFamily: 'var(--mono)',
            }}
          />
          <button
            type="submit"
            disabled={connecting || !fullName.trim()}
            style={{
              background: 'var(--accent)',
              color: '#0B1120',
              border: 'none',
              padding: '0 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: connecting || !fullName.trim() ? 'not-allowed' : 'pointer',
              opacity: connecting || !fullName.trim() ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {connecting ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
            {connecting ? 'Connecting…' : 'Connect'}
          </button>
        </form>
        {connectError && (
          <div role="alert" style={{ color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>
            {connectError}
          </div>
        )}

        <div style={{ marginTop: '16px' }}>
          {loading ? (
            <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Loading repositories…</div>
          ) : error ? (
            <div role="alert" style={{ color: '#EF4444', fontSize: '13.5px' }}>{error}</div>
          ) : repos.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>No repositories connected yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <GitBranch size={18} color="var(--accent)" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>
                        {repo.name} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>#{repo.id}</span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-dim)',
                          fontFamily: 'var(--mono)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {repo.url}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                    <button style={linkBtn} onClick={() => openRepo(repo.id, '/findings')}>
                      <ShieldAlert size={13} /> Findings
                    </button>
                    <button style={linkBtn} onClick={() => openRepo(repo.id, '/fixes')}>
                      <CheckSquare size={13} /> Fixes
                    </button>
                    <button
                      onClick={() => handleDisconnect(repo)}
                      title="Disconnect repository"
                      aria-label={`Disconnect ${repo.name}`}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Integrations */}
      <div style={card}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={16} /> Integrations
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: '0 0 16px 0' }}>
          API keys are stored as environment variables on the server and are never sent to the browser.
        </p>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13.5px', color: 'var(--text-dim)', lineHeight: 1.8 }}>
          <li><code>GEMINI_API_KEY</code> — powers AI explanations and fix suggestions</li>
          <li><code>GITHUB_TOKEN</code> — used to push branches and open pull requests</li>
          <li><code>JWT_SECRET</code> — signs your login tokens</li>
        </ul>
      </div>
    </div>
  );
};