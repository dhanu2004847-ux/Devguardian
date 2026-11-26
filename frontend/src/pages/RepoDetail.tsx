import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, ArrowRight, Loader2, ShieldAlert, CheckSquare } from 'lucide-react';
import { fetchRepos } from '../lib/repoApi';
import { fetchScanHistory, fetchFindings, startScan } from '../lib/scanApi';
import type { Finding, ScanResult } from '../lib/scanApi';
import { fetchLatestRisk, recalculateRisk } from '../lib/riskApi';
import type { RiskScore } from '../lib/riskApi';
import { fetchPRs } from '../lib/prApi';

const SEVERITIES = [
  { key: 'CRITICAL', color: '#EF4444' },
  { key: 'HIGH', color: '#F59E0B' },
  { key: 'MEDIUM', color: '#EAB308' },
  { key: 'LOW', color: '#64748B' },
];

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '24px',
};

export const RepoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const repoId = Number(id);

  const [repoName, setRepoName] = useState<string>(`repository #${id}`);
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [risk, setRisk] = useState<RiskScore | null>(null);
  const [prCount, setPrCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [repos, history, riskScore, prs] = await Promise.all([
        fetchRepos().catch(() => []),
        fetchScanHistory(repoId).catch(() => [] as ScanResult[]),
        fetchLatestRisk(repoId),
        fetchPRs(repoId).catch(() => []),
      ]);

      const repo = repos.find((r) => r.id === repoId);
      if (repo) {
        setRepoName(repo.name);
        setRepoUrl(repo.url);
      }
      setScans(history);
      setRisk(riskScore);
      setPrCount(prs.length);

      if (history.length > 0) {
        const latest = history[history.length - 1];
        setFindings(await fetchFindings(latest.id).catch(() => []));
      } else {
        setFindings([]);
      }
    } finally {
      setLoading(false);
    }
  }, [id, repoId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleScan = async () => {
    setError(null);
    setScanning(true);
    try {
      await startScan(repoId);
      await recalculateRisk(repoId);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'The scan failed. Check that the backend and Docker Desktop are running.');
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-dim)', padding: '40px' }}>Loading repository…</div>;
  }

  const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  findings.forEach((f) => {
    if (f.severity in counts) counts[f.severity] += 1;
  });
  const latestScan = scans.length > 0 ? scans[scans.length - 1] : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '16px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '4px' }}>repository /</div>
          <h1 style={{ fontSize: '30px', margin: 0 }}>{repoName}</h1>
          {repoUrl && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>{repoUrl}</div>
          )}
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          style={{
            background: 'var(--accent)',
            border: 'none',
            color: '#0B1120',
            padding: '10px 18px',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: scanning ? 'not-allowed' : 'pointer',
            opacity: scanning ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          {scanning ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
          {scanning ? 'Scanning… (about a minute)' : 'Run Full Scan'}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#EF4444',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13.5px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      {/* Summary hero */}
      <div style={{ ...card, padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        Health score (out of 100, higher is safer)
          </div>
          <div style={{ fontSize: '42px', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>
            {risk ? risk.score : '—'}
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: '14px' }}>
            {latestScan
              ? `${findings.length} finding${findings.length === 1 ? '' : 's'} in the latest scan (#${latestScan.id}).`
              : 'No scans yet. Click "Run Full Scan" to analyse this repository.'}
          </p>
        </div>
        <button
          onClick={() => navigate(`/repos/${id}/findings`)}
          disabled={!latestScan}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '10px 16px',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: latestScan ? 'pointer' : 'not-allowed',
            opacity: latestScan ? 1 : 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          View Findings <ArrowRight size={16} />
        </button>
      </div>

      {/* Severity counts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {SEVERITIES.map((s) => (
          <div key={s.key} style={{ ...card, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '6px' }}>
              <ShieldAlert size={14} color={s.color} /> {s.key}
            </div>
            <div style={{ fontSize: '28px', fontFamily: 'var(--mono)', fontWeight: 600, color: s.color }}>{counts[s.key]}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={card}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--text)' }}>Scan history</h3>
          {scans.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>No scans have been run yet.</p>
          ) : (
            <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-dim)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...scans].reverse().slice(0, 5).map((s, i) => (
                <li key={s.id}>
                  <strong style={{ color: 'var(--text)' }}>Scan #{s.id}</strong>
                  {i === 0 ? ' — latest' : ''}
                </li>
              ))}
              {scans.length > 5 && <li>…and {scans.length - 5} older</li>}
            </ul>
          )}
        </div>

        <div style={card}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--text)' }}>AI fix proposals</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '16px' }}>
            {prCount === 0
              ? 'No fixes proposed yet. Open Findings and click "Propose fix".'
              : `${prCount} fix proposal${prCount === 1 ? '' : 's'} for this repository.`}
          </p>
          <button
            onClick={() => navigate(`/repos/${id}/fixes`)}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckSquare size={14} /> Review PR Fixes
          </button>
        </div>
      </div>
    </div>
  );
};