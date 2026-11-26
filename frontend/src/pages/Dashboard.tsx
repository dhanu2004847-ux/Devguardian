import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, GitBranch, CheckCircle2, Bot, ArrowUpRight } from 'lucide-react';
import { fetchRepos } from '../lib/repoApi';
import type { Repo } from '../lib/repoApi';
import { fetchLatestRisk } from '../lib/riskApi';
import type { RiskScore } from '../lib/riskApi';

interface RepoWithRisk extends Repo {
  risk: RiskScore | null;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<RepoWithRisk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const repoList = await fetchRepos();
        const withRisk = await Promise.all(
          repoList.map(async (repo) => ({
            ...repo,
            risk: await fetchLatestRisk(repo.id),
          }))
        );
        setRepos(withRisk);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalCritical = repos.reduce((sum, r) => sum + (r.risk?.criticalCount ?? 0), 0);
  const totalHigh = repos.reduce((sum, r) => sum + (r.risk?.highCount ?? 0), 0);
  const scoredRepos = repos.filter((r) => r.risk !== null);
  const avgScore = scoredRepos.length
    ? Math.round(scoredRepos.reduce((sum, r) => sum + (r.risk?.score ?? 0), 0) / scoredRepos.length)
    : null;

  const stats = [
    { label: 'Active Repositories', value: String(repos.length), icon: GitBranch },
    { label: 'Critical + High Findings', value: String(totalCritical + totalHigh), icon: ShieldAlert, alert: totalCritical + totalHigh > 0 },
    { label: 'Repos Scanned', value: String(scoredRepos.length), icon: Bot },
    { label: 'Average Health Score', value: avgScore !== null ? `${avgScore}/100` : 'N/A', icon: CheckCircle2 },
  ];

  if (loading) {
    return <div style={{ color: '#94A3B8', padding: '40px' }}>Loading your repositories…</div>;
  }

  return (
    <div style={{ color: '#F8FAFC' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Security Command Center</h1>
          <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0 }}>Real-time repository health, pulled from your live scans.</p>
        </div>
        <button
          onClick={() => navigate('/ai')}
          style={{
            background: 'rgba(34, 211, 166, 0.1)',
            border: '1px solid rgba(34, 211, 166, 0.3)',
            color: '#22d3ee',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Bot size={16} /> Launch AI Agent Hub <ArrowUpRight size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 500 }}>{stat.label}</span>
                <div style={{ padding: '8px', background: stat.alert ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 211, 166, 0.1)', borderRadius: '8px', color: stat.alert ? '#EF4444' : '#22d3ee' }}>
                  <Icon size={18} />
                </div>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em' }}>{stat.value}</div>
            </div>
          );
        })}
      </div>

      <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>Monitored Codebases</h3>

        {repos.length === 0 ? (
                    <div style={{ color: '#64748B', fontSize: '14px' }}>
            No repositories connected yet.{' '}
            <button
              onClick={() => navigate('/settings')}
              style={{ background: 'none', border: 'none', color: '#22d3ee', cursor: 'pointer', fontSize: '14px', padding: 0, textDecoration: 'underline' }}
            >
              Connect one in Settings
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {repos.map((repo) => {
              const score = repo.risk?.score;
              const status = score === undefined || score === null
                ? 'Not Scanned'
                : score >= 80 ? 'Secure'
                : score >= 50 ? 'Needs Attention'
                : 'Action Required';
              const isAlert = status === 'Action Required' || status === 'Needs Attention';

              return (
                <div key={repo.id} onClick={() => navigate(`/repos/${repo.id}`)} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  background: 'rgba(2, 6, 23, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <GitBranch size={16} color="#22d3ee" />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{repo.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>{repo.url}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {score !== undefined && score !== null && (
                      <span style={{ fontSize: '13px', color: '#94A3B8' }}>{score}/100</span>
                    )}
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      background: isAlert ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 211, 166, 0.1)',
                      color: isAlert ? '#EF4444' : '#22d3ee',
                      fontWeight: 500,
                    }}>
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};