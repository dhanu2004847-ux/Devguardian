import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GitPullRequest, ExternalLink } from 'lucide-react';
import { fetchPRs, approvePR, rejectPR } from '../lib/prApi';
import type { PullRequestRecord } from '../lib/prApi';

const statusStyle: Record<string, { label: string; bg: string; color: string }> = {
  PROPOSED: { label: 'Awaiting Approval', bg: 'rgba(245,131,76,.15)', color: 'var(--high)' },
  APPROVED: { label: 'PR Created', bg: 'rgba(34,211,166,.15)', color: 'var(--accent)' },
  REJECTED: { label: 'Discarded', bg: 'rgba(143,160,191,.15)', color: 'var(--text-dim)' },
};

export const PRReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [prs, setPrs] = useState<PullRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    try {
      const list = await fetchPRs(Number(id));
      setPrs([...list].sort((a, b) => b.id - a.id));
    } catch {
      setError('Could not load fixes for this repository.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handle(action: 'approve' | 'reject', prId: number) {
    setBusyId(prId);
    setError(null);
    try {
      if (action === 'approve') await approvePR(prId);
      else await rejectPR(prId);
      await load();
    } catch {
      setError(
        action === 'approve'
          ? 'Could not create the GitHub PR. Check that GITHUB_TOKEN is set and you own the repository.'
          : 'Could not discard this fix.'
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <div style={{ color: 'var(--text-dim)', padding: '40px' }}>Loading fixes…</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '30px', margin: '0 0 6px' }}>PR Review & Fixes</h1>
      <p style={{ color: 'var(--text-dim)', margin: '0 0 24px', fontSize: '14.5px' }}>
        Approve AI-suggested code corrections to automatically open a verified GitHub pull request.
      </p>

      {error && (
        <div role="alert" style={{ background: 'rgba(240,71,93,.1)', border: '1px solid rgba(240,71,93,.3)', color: 'var(--critical)', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {prs.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
          No fixes proposed yet. Open a finding and use “AI Explain & Fix” to propose one.
        </p>
      ) : (
        prs.map((pr) => {
          const s = statusStyle[pr.status];
          const busy = busyId === pr.id;
          return (
            <div key={pr.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text)' }}>
                  <GitPullRequest size={18} color="var(--accent)" /> Fix for finding #{pr.findingId}
                </div>
                <span style={{ fontSize: '12px', background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '10px' }}>
                  {s.label}
                </span>
              </div>

              <pre style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px', fontFamily: 'var(--mono)', fontSize: '12px', marginBottom: '20px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '320px', overflowY: 'auto', color: 'var(--text)' }}>
                {pr.diffContent ?? '(no suggestion text)'}
              </pre>

              {pr.status === 'PROPOSED' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handle('approve', pr.id)}
                    disabled={busy}
                    style={{ background: 'var(--accent)', color: '#0B1120', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
                  >
                    {busy ? 'Working…' : 'Approve & Create GitHub PR'}
                  </button>
                  <button
                    onClick={() => handle('reject', pr.id)}
                    disabled={busy}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--critical)', padding: '10px 18px', borderRadius: '6px', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
                  >
                    Discard Fix
                  </button>
                </div>
              )}

              {pr.status === 'APPROVED' && pr.githubPrUrl && (
                <a href={pr.githubPrUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '13px', fontWeight: 600 }}>
                  View pull request on GitHub <ExternalLink size={14} />
                </a>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};